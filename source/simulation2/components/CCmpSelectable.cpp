/* Copyright (C) 2017 Wildfire Games.
 * This file is part of 0 A.D.
 *
 * 0 A.D. is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * 0 A.D. is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with 0 A.D.  If not, see <http://www.gnu.org/licenses/>.
 */

#include "precompiled.h"

#include "ICmpSelectable.h"

#include "graphics/Overlay.h"
#include "graphics/Terrain.h"
#include "graphics/TextureManager.h"
#include "maths/Ease.h"
#include "maths/MathUtil.h"
#include "maths/Matrix3D.h"
#include "maths/Vector3D.h"
#include "maths/Vector2D.h"
#include "ps/Profile.h"
#include "renderer/Scene.h"
#include "renderer/Renderer.h"
#include "simulation2/MessageTypes.h"
#include "simulation2/components/ICmpPosition.h"
#include "simulation2/components/ICmpFootprint.h"
#include "simulation2/components/ICmpVisual.h"
#include "simulation2/components/ICmpTerrain.h"
#include "simulation2/components/ICmpOwnership.h"
#include "simulation2/components/ICmpPlayer.h"
#include "simulation2/components/ICmpPlayerManager.h"
#include "simulation2/components/ICmpWaterManager.h"
#include "simulation2/helpers/Render.h"
#include "simulation2/system/Component.h"

// Minimum alpha value for always visible overlays [0 fully transparent, 1 fully opaque]
static const float MIN_ALPHA_ALWAYS_VISIBLE = 0.65f;
// Minimum alpha value for other overlays
static const float MIN_ALPHA_UNSELECTED = 0.0f;
// Desaturation value for unselected, always visible overlays (0.33 = 33% desaturated or 66% of original saturation)
static const float RGB_DESATURATION = 0.333333f;

class CCmpSelectable : public ICmpSelectable
{
public:
	static void ClassInit(CComponentManager& componentManager)
	{
		componentManager.SubscribeToMessageType(MT_OwnershipChanged);
		componentManager.SubscribeToMessageType(MT_PositionChanged);
		componentManager.SubscribeToMessageType(MT_TerrainChanged);
		componentManager.SubscribeToMessageType(MT_WaterChanged);
	}

	DEFAULT_COMPONENT_ALLOCATOR(Selectable)

	CCmpSelectable()
		: m_DebugBoundingBoxOverlay(NULL), m_DebugSelectionBoxOverlay(NULL),
		  m_BuildingOverlay(NULL), m_UnitOverlay(NULL),
		  m_FadeBaselineAlpha(0.f), m_FadeDeltaAlpha(0.f), m_FadeProgress(0.f),
		  m_Selected(false), m_Cached(false), m_Visible(false), m_RangeOverlayData()
	{
		m_Color = CColor(0, 0, 0, m_FadeBaselineAlpha);
	}

	~CCmpSelectable()
	{
		delete m_DebugBoundingBoxOverlay;
		delete m_DebugSelectionBoxOverlay;
		delete m_BuildingOverlay;
		delete m_UnitOverlay;
		for (RangeOverlayData& rangeOverlay : m_RangeOverlayData) 
			delete rangeOverlay.second;
	}

	static std::string GetSchema()
	{
		return
			"<a:help>Allows this entity to be selected by the player.</a:help>"
			"<a:example/>"
			"<optional>"
				"<element name='EditorOnly' a:help='If this element is present, the entity is only selectable in Atlas'>"
					"<empty/>"
				"</element>"
			"</optional>"
			"<element name='Overlay' a:help='Specifies the type of overlay to be displayed when this entity is selected'>"
				"<optional>"
					"<element name='AlwaysVisible' a:help='If this element is present, the selection overlay will always be visible (with transparency and desaturation)'>"
						"<empty/>"
					"</element>"
				"</optional>"
				"<choice>"
					"<element name='Texture' a:help='Displays a texture underneath the entity.'>"
						"<element name='MainTexture' a:help='Texture to display underneath the entity. Filepath relative to art/textures/selection/.'><text/></element>"
						"<element name='MainTextureMask' a:help='Mask texture that controls where to apply player color. Filepath relative to art/textures/selection/.'><text/></element>"
					"</element>"
					"<element name='Outline' a:help='Traces the outline of the entity with a line texture.'>"
						"<element name='LineTexture' a:help='Texture to apply to the line. Filepath relative to art/textures/selection/.'><text/></element>"
						"<element name='LineTextureMask' a:help='Texture that controls where to apply player color. Filepath relative to art/textures/selection/.'><text/></element>"
						"<element name='LineThickness' a:help='Thickness of the line, in world units.'><ref name='positiveDecimal'/></element>"
					"</element>"
				"</choice>"
			"</element>";
	}

	virtual void Init(const CParamNode& paramNode)
	{
		m_EditorOnly = paramNode.GetChild("EditorOnly").IsOk();

		// Certain special units always have their selection overlay shown
		m_AlwaysVisible = paramNode.GetChild("Overlay").GetChild("AlwaysVisible").IsOk();
		if (m_AlwaysVisible)
		{
			m_AlphaMin = MIN_ALPHA_ALWAYS_VISIBLE;
			m_Color.a = m_AlphaMin;
		}
		else
			m_AlphaMin = MIN_ALPHA_UNSELECTED;

		const CParamNode& textureNode = paramNode.GetChild("Overlay").GetChild("Texture");
		const CParamNode& outlineNode = paramNode.GetChild("Overlay").GetChild("Outline");

		// Save some memory by using interned file paths in these descriptors (almost all actors and
		// entities have this component, and many use the same textures).
		if (textureNode.IsOk())
		{
			// textured quad mode (dynamic, for units)
			m_OverlayDescriptor.m_Type = ICmpSelectable::DYNAMIC_QUAD;
			m_OverlayDescriptor.m_QuadTexture = CStrIntern(TEXTUREBASEPATH + textureNode.GetChild("MainTexture").ToUTF8());
			m_OverlayDescriptor.m_QuadTextureMask = CStrIntern(TEXTUREBASEPATH + textureNode.GetChild("MainTextureMask").ToUTF8());
		}
		else if (outlineNode.IsOk())
		{
			// textured outline mode (static, for buildings)
			m_OverlayDescriptor.m_Type = ICmpSelectable::STATIC_OUTLINE;
			m_OverlayDescriptor.m_LineTexture = CStrIntern(TEXTUREBASEPATH + outlineNode.GetChild("LineTexture").ToUTF8());
			m_OverlayDescriptor.m_LineTextureMask = CStrIntern(TEXTUREBASEPATH + outlineNode.GetChild("LineTextureMask").ToUTF8());
			m_OverlayDescriptor.m_LineThickness = outlineNode.GetChild("LineThickness").ToFloat();
		}

		m_EnabledInterpolate = false;
		m_EnabledRenderSubmit = false;
		UpdateMessageSubscriptions();
	}

	virtual void Deinit() { }

	virtual void Serialize(ISerializer& UNUSED(serialize))
	{
		// Nothing to do here (the overlay object is not worth saving, it'll get
		// reconstructed by the GUI soon enough, I think)
	}

	virtual void Deserialize(const CParamNode& paramNode, IDeserializer& UNUSED(deserialize))
	{
		// Need to call Init to reload the template properties
		Init(paramNode);
	}

	virtual void HandleMessage(const CMessage& msg, bool UNUSED(global));

	virtual void SetSelectionHighlight(const CColor& color, bool selected)
	{
		m_Selected = selected;
		m_Color.r = color.r;
		m_Color.g = color.g;
		m_Color.b = color.b;

		// Always-visible overlays will be desaturated if their parent unit is deselected.
		if (m_AlwaysVisible && !selected)
		{
			float max;

			// Reduce saturation by one-third, the quick-and-dirty way.
			if (m_Color.r > m_Color.b)
				max = (m_Color.r > m_Color.g) ? m_Color.r : m_Color.g;
			else
				max = (m_Color.b > m_Color.g) ? m_Color.b : m_Color.g;

			m_Color.r += (max - m_Color.r) * RGB_DESATURATION;
			m_Color.g += (max - m_Color.g) * RGB_DESATURATION;
			m_Color.b += (max - m_Color.b) * RGB_DESATURATION;
		}

		SetSelectionHighlightAlpha(color.a);
	}

	virtual void SetRangeOverlay(float radius, const std::string& texture, const std::string& textureMask, float thickness)
	{
		if (!CRenderer::IsInitialised())
			return;

		SOverlayDescriptor rangeOverlayDescriptor;
		SOverlayTexturedLine* rangeOverlay = nullptr;

		rangeOverlayDescriptor.m_Radius = radius;
		rangeOverlayDescriptor.m_LineTexture = CStrIntern(TEXTUREBASEPATH + texture);
		rangeOverlayDescriptor.m_LineTextureMask = CStrIntern(TEXTUREBASEPATH + textureMask);
		rangeOverlayDescriptor.m_LineThickness = thickness;

		m_RangeOverlayData.emplace_back(std::make_pair(rangeOverlayDescriptor, rangeOverlay));
	}

	virtual void SetSelectionHighlightAlpha(float alpha)
	{
		alpha = std::max(m_AlphaMin, alpha);

		// set up fading from the current value (as the baseline) to the target value
		m_FadeBaselineAlpha = m_Color.a;
		m_FadeDeltaAlpha = alpha - m_FadeBaselineAlpha;
		m_FadeProgress = 0.f;

		UpdateMessageSubscriptions();
	}

	virtual void SetVisibility(bool visible)
	{
		m_Visible = visible;
		UpdateMessageSubscriptions();
	}

	virtual bool IsEditorOnly() const
	{
		return m_EditorOnly;
	}

	void RenderSubmit(SceneCollector& collector);

	/**
	* Draw a textured overlay. The selection overlays for structures are based solely on footprint shape.
	*/
	void UpdateTexturedOverlay(const SOverlayDescriptor* overlayDescriptor, SOverlayTexturedLine& overlay, float frameOffset, bool buildingOverlay);

	/**
	 * Called from the interpolation handler; responsible for ensuring the dynamic overlay (provided we're
	 * using one) is up-to-date and ready to be submitted to the next rendering run.
	 */
	void UpdateDynamicOverlay(float frameOffset);

	/// Explicitly invalidates the static overlay.
	void InvalidateStaticOverlay();

	/**
	 * Subscribe/unsubscribe to MT_Interpolate, MT_RenderSubmit, depending on
	 * whether we will do any actual work when receiving them. (This is to avoid
	 * the performance cost of receiving messages in the typical case when the
	 * entity is not selected.)
	 *
	 * Must be called after changing m_Visible, m_FadeDeltaAlpha, m_Color.a
	 */
	void UpdateMessageSubscriptions();

	/**
	* Delete range overlays.
	*/
	void ResetRangeOverlays();

private:
	SOverlayDescriptor m_OverlayDescriptor;
	SOverlayTexturedLine* m_BuildingOverlay;
	SOverlayQuad* m_UnitOverlay;

	// Holds the data for any range overlays
	typedef std::pair<SOverlayDescriptor, SOverlayTexturedLine*> RangeOverlayData;
	std::vector<RangeOverlayData> m_RangeOverlayData;

	SOverlayLine* m_DebugBoundingBoxOverlay;
	SOverlayLine* m_DebugSelectionBoxOverlay;

	bool m_EnabledInterpolate;
	bool m_EnabledRenderSubmit;

	// Whether the selectable will be rendered.
	bool m_Visible;
	// Whether the entity is only selectable in Atlas editor
	bool m_EditorOnly;
	// Whether the selection overlay is always visible
	bool m_AlwaysVisible;
	/// Whether the parent entity is selected (caches GUI's selection state).
	bool m_Selected;
	/// Current selection overlay color. Alpha component is subject to fading.
	CColor m_Color;
	/// Whether the selectable's player color has been cached for rendering.
	bool m_Cached;
	/// Minimum value for current selection overlay alpha.
	float m_AlphaMin;
	/// Baseline alpha value to start fading from. Constant during a single fade.
	float m_FadeBaselineAlpha;
	/// Delta between target and baseline alpha. Constant during a single fade. Can be positive or negative.
	float m_FadeDeltaAlpha;
	/// Linear time progress of the fade, between 0 and m_FadeDuration.
	float m_FadeProgress;

	/// Total duration of a single fade, in seconds. Assumed constant for now; feel free to change this into
	/// a member variable if you need to adjust it per component.
	static const double FADE_DURATION;
	static const char* TEXTUREBASEPATH;
};

const double CCmpSelectable::FADE_DURATION = 0.3;
const char* CCmpSelectable::TEXTUREBASEPATH = "art/textures/selection/";

void CCmpSelectable::HandleMessage(const CMessage& msg, bool UNUSED(global))
{
	switch (msg.GetType())
	{
	case MT_Interpolate:
	{
		PROFILE("Selectable::Interpolate");

		const CMessageInterpolate& msgData = static_cast<const CMessageInterpolate&> (msg);

		if (m_FadeDeltaAlpha != 0.f)
		{
			m_FadeProgress += msgData.deltaRealTime;
			if (m_FadeProgress >= FADE_DURATION)
			{
				const float targetAlpha = m_FadeBaselineAlpha + m_FadeDeltaAlpha;

				// stop the fade
				m_Color.a = targetAlpha;
				m_FadeBaselineAlpha = targetAlpha;
				m_FadeDeltaAlpha = 0.f;
				m_FadeProgress = FADE_DURATION; // will need to be reset to start the next fade again
			}
			else
			{
				m_Color.a = Ease::QuartOut(m_FadeProgress, m_FadeBaselineAlpha, m_FadeDeltaAlpha, FADE_DURATION);
			}
		}

		// update dynamic overlay only when visible
		if (m_Color.a > 0)
		{
			UpdateDynamicOverlay(msgData.offset);

			// Update any range overlays
			for (RangeOverlayData& rangeOverlay : m_RangeOverlayData)
			{
				delete rangeOverlay.second;
				rangeOverlay.second = new SOverlayTexturedLine;
				UpdateTexturedOverlay(&rangeOverlay.first, *rangeOverlay.second, msgData.offset, false);
			}
		}

		UpdateMessageSubscriptions();

		break;
	}
	case MT_OwnershipChanged:
	{
		const CMessageOwnershipChanged& msgData = static_cast<const CMessageOwnershipChanged&> (msg);

		// don't update color if there's no new owner (e.g. the unit died)
		if (msgData.to == INVALID_PLAYER)
			break;

		// update the selection highlight color
		CmpPtr<ICmpPlayerManager> cmpPlayerManager(GetSystemEntity());
		if (!cmpPlayerManager)
			break;

		CmpPtr<ICmpPlayer> cmpPlayer(GetSimContext(), cmpPlayerManager->GetPlayerByID(msgData.to));
		if (!cmpPlayer)
			break;

		// Update the highlight color, while keeping the current alpha target value intact
		// (i.e. baseline + delta), so that any ongoing fades simply continue with the new color.
		CColor color = cmpPlayer->GetColor();
		SetSelectionHighlight(CColor(color.r, color.g, color.b, m_FadeBaselineAlpha + m_FadeDeltaAlpha), m_Selected);

		InvalidateStaticOverlay();
		break;
	}
	case MT_PositionChanged:
	{
		if (m_AlwaysVisible)
		{
			const CMessagePositionChanged& msgData = static_cast<const CMessagePositionChanged&> (msg);
			m_AlphaMin = msgData.inWorld ? MIN_ALPHA_ALWAYS_VISIBLE : MIN_ALPHA_UNSELECTED;
			m_Color.a = m_AlphaMin;
		}

		InvalidateStaticOverlay();
		break;
	}
	case MT_TerrainChanged:
	case MT_WaterChanged:
		InvalidateStaticOverlay();
		break;
	case MT_RenderSubmit:
	{
		PROFILE("Selectable::RenderSubmit");

		const CMessageRenderSubmit& msgData = static_cast<const CMessageRenderSubmit&> (msg);
		RenderSubmit(msgData.collector);

		break;
	}
	}
}

void CCmpSelectable::ResetRangeOverlays()
{
	for (RangeOverlayData& rangeOverlay : m_RangeOverlayData)
		delete rangeOverlay.second;
	m_RangeOverlayData.clear();

	UpdateMessageSubscriptions();
}

void CCmpSelectable::UpdateMessageSubscriptions()
{
	bool needInterpolate = false;
	bool needRenderSubmit = false;

	if (m_FadeDeltaAlpha != 0.f || m_Color.a > 0)
		needInterpolate = true;

	if (m_Visible && m_Color.a > 0)
		needRenderSubmit = true;

	if (needInterpolate != m_EnabledInterpolate)
	{
		GetSimContext().GetComponentManager().DynamicSubscriptionNonsync(MT_Interpolate, this, needInterpolate);
		m_EnabledInterpolate = needInterpolate;
	}

	if (needRenderSubmit != m_EnabledRenderSubmit)
	{
		GetSimContext().GetComponentManager().DynamicSubscriptionNonsync(MT_RenderSubmit, this, needRenderSubmit);
		m_EnabledRenderSubmit = needRenderSubmit;
	}
}

void CCmpSelectable::InvalidateStaticOverlay()
{
	SAFE_DELETE(m_BuildingOverlay);
}

void CCmpSelectable::UpdateTexturedOverlay(const SOverlayDescriptor* overlayDescriptor, SOverlayTexturedLine& overlay, float frameOffset, bool buildingOverlay)
{
	if (!CRenderer::IsInitialised())
		return;

	CmpPtr<ICmpPosition> cmpPosition(GetEntityHandle());
	CmpPtr<ICmpFootprint> cmpFootprint(GetEntityHandle());
	if (!cmpFootprint || !cmpPosition || !cmpPosition->IsInWorld())
		return;

	ICmpFootprint::EShape fpShape;
	entity_pos_t fpSize0_fixed, fpSize1_fixed, fpHeight_fixed;
	cmpFootprint->GetShape(fpShape, fpSize0_fixed, fpSize1_fixed, fpHeight_fixed);

	float rotY;
	CVector2D origin;
	cmpPosition->GetInterpolatedPosition2D(frameOffset, origin.X, origin.Y, rotY);
	CFixedVector3D rotation = cmpPosition->GetRotation();

	CTextureProperties texturePropsBase(overlayDescriptor->m_LineTexture.c_str());
	texturePropsBase.SetWrap(GL_CLAMP_TO_BORDER, GL_CLAMP_TO_EDGE);
	texturePropsBase.SetMaxAnisotropy(4.f);

	CTextureProperties texturePropsMask(overlayDescriptor->m_LineTextureMask.c_str());
	texturePropsMask.SetWrap(GL_CLAMP_TO_BORDER, GL_CLAMP_TO_EDGE);
	texturePropsMask.SetMaxAnisotropy(4.f);

	overlay.m_AlwaysVisible = false;
	overlay.m_Closed = true;
	overlay.m_SimContext = &GetSimContext();
	overlay.m_Thickness = overlayDescriptor->m_LineThickness;
	overlay.m_TextureBase = g_Renderer.GetTextureManager().CreateTexture(texturePropsBase);
	overlay.m_TextureMask = g_Renderer.GetTextureManager().CreateTexture(texturePropsMask);
	overlay.m_Color = m_Color;

	if (buildingOverlay && fpShape == ICmpFootprint::SQUARE)
	{
		float s = sinf(-rotation.Y.ToFloat());
		float c = cosf(-rotation.Y.ToFloat());
		CVector2D unitX(c, s);
		CVector2D unitZ(-s, c);

		// Add half the line thickness to the radius so that we get an 'outside' stroke of the footprint shape
		const float halfSizeX = fpSize0_fixed.ToFloat() / 2.f + overlay.m_Thickness / 2.f;
		const float halfSizeZ = fpSize1_fixed.ToFloat() / 2.f + overlay.m_Thickness / 2.f;

		std::vector<CVector2D> points;
		points.push_back(CVector2D(origin + unitX * halfSizeX + unitZ * (-halfSizeZ)));
		points.push_back(CVector2D(origin + unitX * (-halfSizeX) + unitZ * (-halfSizeZ)));
		points.push_back(CVector2D(origin + unitX * (-halfSizeX) + unitZ * halfSizeZ));
		points.push_back(CVector2D(origin + unitX * halfSizeX + unitZ * halfSizeZ));

		SimRender::SubdividePoints(points, TERRAIN_TILE_SIZE / 3.f, overlay.m_Closed);
		overlay.PushCoords(points);
	}
	else
	{
		const float radius = (buildingOverlay ? fpSize0_fixed.ToFloat() : overlayDescriptor->m_Radius) + overlay.m_Thickness / 3.f;
		float stepAngle;
		unsigned numSteps;
		SimRender::AngularStepFromChordLen(TERRAIN_TILE_SIZE / 3.f, radius, stepAngle, numSteps);

		for (unsigned i = 0; i < numSteps; ++i)
		{
			float angle = i * stepAngle;
			float px = origin.X + radius * sinf(angle);
			float pz = origin.Y + radius * cosf(angle);

			overlay.PushCoords(px, pz);
		}
	}

	ENSURE(overlay.m_TextureBase);
}

void CCmpSelectable::UpdateDynamicOverlay(float frameOffset)
{
	// Dynamic overlay lines are allocated once and never deleted. Since they are expected to change frequently,
	// they are assumed dirty on every call to this function, and we should therefore use this function more
	// thoughtfully than calling it right before every frame render.

	if (m_OverlayDescriptor.m_Type != DYNAMIC_QUAD)
		return;

	if (!CRenderer::IsInitialised())
		return;

	CmpPtr<ICmpPosition> cmpPosition(GetEntityHandle());
	CmpPtr<ICmpFootprint> cmpFootprint(GetEntityHandle());
	if (!cmpFootprint || !cmpPosition || !cmpPosition->IsInWorld())
		return;

	float rotY;
	CVector2D position;
	cmpPosition->GetInterpolatedPosition2D(frameOffset, position.X, position.Y, rotY);

	CmpPtr<ICmpWaterManager> cmpWaterManager(GetSystemEntity());
	CmpPtr<ICmpTerrain> cmpTerrain(GetSystemEntity());
	ENSURE(cmpWaterManager && cmpTerrain);

	CTerrain* terrain = cmpTerrain->GetCTerrain();
	ENSURE(terrain);

	ICmpFootprint::EShape fpShape;
	entity_pos_t fpSize0_fixed, fpSize1_fixed, fpHeight_fixed;
	cmpFootprint->GetShape(fpShape, fpSize0_fixed, fpSize1_fixed, fpHeight_fixed);

	// ---------------------------------------------------------------------------------

	if (!m_UnitOverlay)
	{
		m_UnitOverlay = new SOverlayQuad;

		// Assuming we don't need the capability of swapping textures on-demand.
		CTextureProperties texturePropsBase(m_OverlayDescriptor.m_QuadTexture.c_str());
		texturePropsBase.SetWrap(GL_CLAMP_TO_BORDER, GL_CLAMP_TO_EDGE);
		texturePropsBase.SetMaxAnisotropy(4.f);

		CTextureProperties texturePropsMask(m_OverlayDescriptor.m_QuadTextureMask.c_str());
		texturePropsMask.SetWrap(GL_CLAMP_TO_BORDER, GL_CLAMP_TO_EDGE);
		texturePropsMask.SetMaxAnisotropy(4.f);

		m_UnitOverlay->m_Texture = g_Renderer.GetTextureManager().CreateTexture(texturePropsBase);
		m_UnitOverlay->m_TextureMask = g_Renderer.GetTextureManager().CreateTexture(texturePropsMask);
	}

	m_UnitOverlay->m_Color = m_Color;

	// TODO: some code duplication here :< would be nice to factor out getting the corner points of an
	// entity based on its footprint sizes (and regardless of whether it's a circle or a square)

	float s = sinf(-rotY);
	float c = cosf(-rotY);
	CVector2D unitX(c, s);
	CVector2D unitZ(-s, c);

	float halfSizeX = fpSize0_fixed.ToFloat();
	float halfSizeZ = fpSize1_fixed.ToFloat();
	if (fpShape == ICmpFootprint::SQUARE)
	{
		halfSizeX /= 2.0f;
		halfSizeZ /= 2.0f;
	}

	std::vector<CVector2D> points;
	points.push_back(CVector2D(position + unitX *(-halfSizeX)   + unitZ *  halfSizeZ));  // top left
	points.push_back(CVector2D(position + unitX *(-halfSizeX)   + unitZ *(-halfSizeZ))); // bottom left
	points.push_back(CVector2D(position + unitX *  halfSizeX    + unitZ *(-halfSizeZ))); // bottom right
	points.push_back(CVector2D(position + unitX *  halfSizeX    + unitZ *  halfSizeZ));  // top right

	for (int i=0; i < 4; i++)
	{
		float quadY = std::max(
			terrain->GetExactGroundLevel(points[i].X, points[i].Y),
			cmpWaterManager->GetExactWaterLevel(points[i].X, points[i].Y)
		);

		m_UnitOverlay->m_Corners[i] = CVector3D(points[i].X, quadY, points[i].Y);
	}
}

void CCmpSelectable::RenderSubmit(SceneCollector& collector)
{
	// don't render selection overlay if it's not gonna be visible
	if (!ICmpSelectable::m_OverrideVisible)
		return;

	if (m_Visible && m_Color.a > 0)
	{
		if (!m_Cached)
		{
			// Default to white if there's no owner (e.g. decorative, editor-only actors)
			CColor color = CColor(1.0, 1.0, 1.0, 1.0);
			CmpPtr<ICmpOwnership> cmpOwnership(GetEntityHandle());
			if (cmpOwnership)
			{
				player_id_t owner = cmpOwnership->GetOwner();
				if (owner == INVALID_PLAYER)
					return;

				// Try to initialize m_Color to the owning player's color.
				CmpPtr<ICmpPlayerManager> cmpPlayerManager(GetSystemEntity());
				if (!cmpPlayerManager)
					return;

				CmpPtr<ICmpPlayer> cmpPlayer(GetSimContext(), cmpPlayerManager->GetPlayerByID(owner));
				if (!cmpPlayer)
					return;

				color = cmpPlayer->GetColor();
			}
			color.a = m_FadeBaselineAlpha + m_FadeDeltaAlpha;

			SetSelectionHighlight(color, m_Selected);
			m_Cached = true;
		}

		switch (m_OverlayDescriptor.m_Type)
		{
			case STATIC_OUTLINE:
				{
					if (!m_BuildingOverlay)
						m_BuildingOverlay = new SOverlayTexturedLine;

					UpdateTexturedOverlay(&m_OverlayDescriptor, *m_BuildingOverlay, 0, true);
					m_BuildingOverlay->m_Color = m_Color; // done separately so alpha changes don't require a full update call
					collector.Submit(m_BuildingOverlay);
				}
				break;
			case DYNAMIC_QUAD:
				{
					if (m_UnitOverlay)
						collector.Submit(m_UnitOverlay);
				}
				break;
			default:
				break;
		}

		for (const RangeOverlayData& rangeOverlay : m_RangeOverlayData)
			collector.Submit(rangeOverlay.second);
	}

	// Render bounding box debug overlays if we have a positive target alpha value. This ensures
	// that the debug overlays respond immediately to deselection without delay from fading out.
	if (m_FadeBaselineAlpha + m_FadeDeltaAlpha > 0)
	{
		if (ICmpSelectable::ms_EnableDebugOverlays)
		{
			// allocate debug overlays on-demand
			if (!m_DebugBoundingBoxOverlay) m_DebugBoundingBoxOverlay = new SOverlayLine;
			if (!m_DebugSelectionBoxOverlay) m_DebugSelectionBoxOverlay = new SOverlayLine;

			CmpPtr<ICmpVisual> cmpVisual(GetEntityHandle());
			if (cmpVisual)
			{
				SimRender::ConstructBoxOutline(cmpVisual->GetBounds(), *m_DebugBoundingBoxOverlay);
				m_DebugBoundingBoxOverlay->m_Thickness = 2;
				m_DebugBoundingBoxOverlay->m_Color = CColor(1.f, 0.f, 0.f, 1.f);

				SimRender::ConstructBoxOutline(cmpVisual->GetSelectionBox(), *m_DebugSelectionBoxOverlay);
				m_DebugSelectionBoxOverlay->m_Thickness = 2;
				m_DebugSelectionBoxOverlay->m_Color = CColor(0.f, 1.f, 0.f, 1.f);

				collector.Submit(m_DebugBoundingBoxOverlay);
				collector.Submit(m_DebugSelectionBoxOverlay);
			}
		}
		else
		{
			// reclaim debug overlay line memory when no longer debugging (and make sure to set to zero after deletion)
			if (m_DebugBoundingBoxOverlay) SAFE_DELETE(m_DebugBoundingBoxOverlay);
			if (m_DebugSelectionBoxOverlay) SAFE_DELETE(m_DebugSelectionBoxOverlay);
		}
	}
}

REGISTER_COMPONENT_TYPE(Selectable)
