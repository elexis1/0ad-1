/* Copyright (C) 2015 Wildfire Games.
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

#include "ScenarioEditor.h"

#include "wx/busyinfo.h"
#include "wx/clipbrd.h"
#include "wx/config.h"
#include "wx/dir.h"
#include "wx/evtloop.h"
#include "wx/ffile.h"
#include "wx/filename.h"
#include "wx/image.h"
#include "wx/sstream.h"
#include "wx/sysopt.h"
#include "wx/tooltip.h"
#include "wx/xml/xml.h"
#include "wx/xrc/xmlres.h"

#include "General/AtlasEventLoop.h"
#include "General/Datafile.h"

#include "CustomControls/Buttons/ToolButton.h"
#include "CustomControls/Canvas/Canvas.h"
#include "CustomControls/HighResTimer/HighResTimer.h"
#include "CustomControls/MapDialog/MapDialog.h"

#include "GameInterface/MessagePasser.h"
#include "GameInterface/Messages.h"

#include "Misc/KeyMap.h"

#include "Tools/Common/Tools.h"
#include "Tools/Common/Brushes.h"
#include "Tools/Common/MiscState.h"

static HighResTimer g_Timer;

using namespace AtlasMessage;

//////////////////////////////////////////////////////////////////////////

// GL functions exported from DLL, and called by game (in a separate
// thread to the standard wx one)
ATLASDLLIMPEXP void Atlas_GLSetCurrent(void* canvas)
{
	static_cast<Canvas*>(canvas)->SetCurrent();
}

ATLASDLLIMPEXP void Atlas_GLSwapBuffers(void* canvas)
{
	static_cast<Canvas*>(canvas)->SwapBuffers();
}


//////////////////////////////////////////////////////////////////////////

class GameCanvas : public Canvas
{
public:
	GameCanvas(ScenarioEditor& scenarioEditor, wxWindow* parent, int* attribList)
		: Canvas(parent, attribList, wxWANTS_CHARS),
		m_ScenarioEditor(scenarioEditor), m_MouseState(NONE), m_LastMouseState(NONE)
	{
	}

private:

	bool KeyScroll(wxKeyEvent& evt, bool enable)
	{
		int dir;
		switch (evt.GetKeyCode())
		{
		case 'A': case WXK_LEFT:  dir = eScrollConstantDir::LEFT; break;
		case 'D': case WXK_RIGHT: dir = eScrollConstantDir::RIGHT; break;
		case 'W': case WXK_UP:    dir = eScrollConstantDir::FORWARDS; break;
		case 'S': case WXK_DOWN:  dir = eScrollConstantDir::BACKWARDS; break;
		case 'Q': case '[':       dir = eScrollConstantDir::CLOCKWISE; break;
		case 'E': case ']':       dir = eScrollConstantDir::ANTICLOCKWISE; break;
		case WXK_SHIFT: case WXK_CONTROL: dir = -1; break;
		default: return false;
		}

		float speed = 120.f * ScenarioEditor::GetSpeedModifier();

		if (dir == -1) // changed modifier keys - update all currently-scrolling directions
		{
			if (wxGetKeyState(WXK_LEFT))       POST_MESSAGE(ScrollConstant, (eRenderView::GAME, eScrollConstantDir::LEFT, speed));
			if (wxGetKeyState(WXK_RIGHT))      POST_MESSAGE(ScrollConstant, (eRenderView::GAME, eScrollConstantDir::RIGHT, speed));
			if (wxGetKeyState(WXK_UP))         POST_MESSAGE(ScrollConstant, (eRenderView::GAME, eScrollConstantDir::FORWARDS, speed));
			if (wxGetKeyState(WXK_DOWN))       POST_MESSAGE(ScrollConstant, (eRenderView::GAME, eScrollConstantDir::BACKWARDS, speed));
			if (wxGetKeyState((wxKeyCode)'[')) POST_MESSAGE(ScrollConstant, (eRenderView::GAME, eScrollConstantDir::CLOCKWISE, speed));
			if (wxGetKeyState((wxKeyCode)']')) POST_MESSAGE(ScrollConstant, (eRenderView::GAME, eScrollConstantDir::ANTICLOCKWISE, speed));
			return false;
		}
		else
		{
			POST_MESSAGE(ScrollConstant, (eRenderView::GAME, dir, enable ? speed : 0.0f));
			return true;
		}
	}

	void OnKeyDown(wxKeyEvent& evt)
	{
		if (m_ScenarioEditor.GetToolManager().GetCurrentTool()->OnKey(evt, ITool::KEY_DOWN))
		{
			// Key event has been handled by the tool, so don't try
			// to use it for camera motion too
			return;
		}

		if (KeyScroll(evt, true))
			return;

		// Slight hack: Only pass 'special' keys; normal keys will generate a translated Char event instead
		if (evt.GetKeyCode() >= 256)
			POST_MESSAGE(GuiKeyEvent, (GetSDLKeyFromWxKeyCode(evt.GetKeyCode()), evt.GetUnicodeKey(), true));

		evt.Skip();
	}

	void OnKeyUp(wxKeyEvent& evt)
	{
		if (m_ScenarioEditor.GetToolManager().GetCurrentTool()->OnKey(evt, ITool::KEY_UP))
			return;

		if (KeyScroll(evt, false))
			return;

		// Slight hack: Only pass 'special' keys; normal keys will generate a translated Char event instead
		if (evt.GetKeyCode() >= 256)
			POST_MESSAGE(GuiKeyEvent, (GetSDLKeyFromWxKeyCode(evt.GetKeyCode()), evt.GetUnicodeKey(), false));

		evt.Skip();
	}

	void OnChar(wxKeyEvent& evt)
	{
		if (m_ScenarioEditor.GetToolManager().GetCurrentTool()->OnKey(evt, ITool::KEY_CHAR))
			return;

		// Alt+enter toggles fullscreen
		if (evt.GetKeyCode() == WXK_RETURN && wxGetKeyState(WXK_ALT))
		{
			if (m_ScenarioEditor.IsFullScreen())
				m_ScenarioEditor.ShowFullScreen(false);
			else
				m_ScenarioEditor.ShowFullScreen(true, wxFULLSCREEN_NOBORDER | wxFULLSCREEN_NOCAPTION);
			return;
		}

		if (evt.GetKeyCode() == 'c')
		{
			POST_MESSAGE(CameraReset, ());
			return;
		}

		int dir = 0;
		if (evt.GetKeyCode() == '-' || evt.GetKeyCode() == '_')
			dir = -1;
		else if (evt.GetKeyCode() == '+' || evt.GetKeyCode() == '=')
			dir = +1;
		// TODO: internationalisation (-/_ and +/= don't always share a key)

		if (dir)
		{
			float speed = 16.f * ScenarioEditor::GetSpeedModifier();
			POST_MESSAGE(SmoothZoom, (eRenderView::GAME, speed*dir));
		}
		else
		{
			// Slight hack: Only pass 'normal' keys; special keys will generate a KeyDown/KeyUp event instead
			if (evt.GetKeyCode() < 256)
				POST_MESSAGE(GuiCharEvent, (GetSDLKeyFromWxKeyCode(evt.GetKeyCode()), evt.GetUnicodeKey()));

			evt.Skip();
		}
	}

	void OnKillFocus(wxFocusEvent& evt)
	{
		// Stop any scrolling, since otherwise we'll carry on forever if
		// we lose focus and the KeyUp events go to a different window
		POST_MESSAGE(ScrollConstant, (eRenderView::GAME, eScrollConstantDir::LEFT, 0.0f));
		POST_MESSAGE(ScrollConstant, (eRenderView::GAME, eScrollConstantDir::RIGHT, 0.0f));
		POST_MESSAGE(ScrollConstant, (eRenderView::GAME, eScrollConstantDir::FORWARDS, 0.0f));
		POST_MESSAGE(ScrollConstant, (eRenderView::GAME, eScrollConstantDir::BACKWARDS, 0.0f));
		POST_MESSAGE(ScrollConstant, (eRenderView::GAME, eScrollConstantDir::CLOCKWISE, 0.0f));
		POST_MESSAGE(ScrollConstant, (eRenderView::GAME, eScrollConstantDir::ANTICLOCKWISE, 0.0f));

		evt.Skip();
	}

	virtual void HandleMouseEvent(wxMouseEvent& evt)
	{

		// TODO or at least to think about: When using other controls in the
		// editor, it's annoying that keyboard/scrollwheel no longer navigate
		// around the world until you click on it.
		// Setting focus back whenever the mouse moves over the GL window
		// feels like a fairly natural solution to me, since I can use
		// e.g. brush-editing controls normally, and then move the mouse to
		// see the brush outline and magically get given back full control
		// of the camera.
		if (evt.Moving())
			SetFocus();

		if (m_ScenarioEditor.GetToolManager().GetCurrentTool()->OnMouse(evt))
		{
			// Mouse event has been handled by the tool, so don't try
			// to use it for camera motion too
			return;
		}

		// Global mouse event handlers (for camera motion)

		if (evt.GetWheelRotation())
		{
			float speed = 16.f * ScenarioEditor::GetSpeedModifier();
			POST_MESSAGE(SmoothZoom, (eRenderView::GAME, evt.GetWheelRotation() * speed / evt.GetWheelDelta()));
		}
		else
		{
			if (evt.MiddleIsDown())
			{
				if (wxGetKeyState(WXK_CONTROL) || evt.RightIsDown())
					m_MouseState = ROTATEAROUND;
				else
					m_MouseState = SCROLL;
			}
			else
				m_MouseState = NONE;

			if (m_MouseState != m_LastMouseState)
			{
				switch (m_MouseState)
				{
				case NONE: break;
				case SCROLL: POST_MESSAGE(Scroll, (eRenderView::GAME, eScrollType::FROM, evt.GetPosition())); break;
				case ROTATEAROUND: POST_MESSAGE(RotateAround, (eRenderView::GAME, eRotateAroundType::FROM, evt.GetPosition())); break;
				default: wxFAIL;
				}
				m_LastMouseState = m_MouseState;
			}
			else if (evt.Dragging())
			{
				switch (m_MouseState)
				{
				case NONE: break;
				case SCROLL: POST_MESSAGE(Scroll, (eRenderView::GAME, eScrollType::TO, evt.GetPosition())); break;
				case ROTATEAROUND: POST_MESSAGE(RotateAround, (eRenderView::GAME, eRotateAroundType::TO, evt.GetPosition())); break;
				default: wxFAIL;
				}
			}
		}

		// Button down and double click appear to be mutually exclusive events,
		//   meaning a second button down event is not sent before a double click
		if (evt.ButtonDown() || evt.ButtonDClick())
			POST_MESSAGE(GuiMouseButtonEvent, (evt.GetButton(), true, evt.GetPosition()));
		else if (evt.ButtonUp())
			POST_MESSAGE(GuiMouseButtonEvent, (evt.GetButton(), false, evt.GetPosition()));
		else if (evt.GetEventType() == wxEVT_MOTION)
			POST_MESSAGE(GuiMouseMotionEvent, (evt.GetPosition()));
	}

	enum { NONE, SCROLL, ROTATEAROUND };
	int m_MouseState, m_LastMouseState;

	ScenarioEditor& m_ScenarioEditor;

	DECLARE_EVENT_TABLE();
};

BEGIN_EVENT_TABLE(GameCanvas, Canvas)
	EVT_KEY_DOWN(GameCanvas::OnKeyDown)
	EVT_KEY_UP(GameCanvas::OnKeyUp)
	EVT_CHAR(GameCanvas::OnChar)
	EVT_KILL_FOCUS(GameCanvas::OnKillFocus)
END_EVENT_TABLE()

//////////////////////////////////////////////////////////////////////////

volatile bool g_FrameHasEnded;
// Called from game thread
ATLASDLLIMPEXP void Atlas_NotifyEndOfFrame()
{
	g_FrameHasEnded = true;
}

enum
{
	ID_Quit = 1,

 	ID_New,
	ID_Open,
	ID_Save,
	ID_SaveAs,
	ID_ImportHeightmap,

    ID_Copy,
    ID_Paste,

	ID_Wireframe,
	ID_MessageTrace,
	ID_Screenshot,
	ID_BigScreenshot,
	ID_JavaScript,
	ID_CameraReset,
	ID_RenderPathFixed,
	ID_RenderPathShader,
	ID_DumpState,
	ID_DumpBinaryState,

	ID_Toolbar,
	ID_ToolbarNew,
	ID_ToolbarOpen,
	
	ID_ToolbarOptionsBegin = 1000, //Space for 998 options
	ID_ToolbarOptionMap,
	ID_ToolbarOptionPlayer,
	ID_ToolbarOptionTerrain,
	ID_ToolbarOptionObject,
	ID_ToolbarOptionEnvironment,
	ID_ToolbarOptionsEnd,
	
	ID_ToolbarToolsBegin = 2000, //space for 998 tools
	ID_ToolbarToolsSelect,
	ID_ToolbarToolsMove,
	ID_ToolbarToolsAlterTerrain,
	ID_ToolbarToolsSmooth,
	ID_ToolbarToolsFlatten,
	ID_ToolbarToolsPainTerrain,
	ID_ToolbarToolsEnd
	
};

BEGIN_EVENT_TABLE(ScenarioEditor, wxFrame)
	EVT_CLOSE(ScenarioEditor::OnClose)
	EVT_TIMER(wxID_ANY, ScenarioEditor::OnTimer)

 	EVT_MENU(ID_New, ScenarioEditor::OnNew)
	EVT_MENU(ID_Open, ScenarioEditor::OnOpen)
	EVT_MENU(ID_Save, ScenarioEditor::OnSave)
	EVT_MENU(ID_SaveAs, ScenarioEditor::OnSaveAs)
	EVT_MENU(ID_ImportHeightmap, ScenarioEditor::OnImportHeightmap)
	EVT_MENU_RANGE(wxID_FILE1, wxID_FILE9, ScenarioEditor::OnMRUFile)

	EVT_MENU(ID_Quit, ScenarioEditor::OnQuit)
	EVT_MENU(wxID_UNDO, ScenarioEditor::OnUndo)
	EVT_MENU(wxID_REDO, ScenarioEditor::OnRedo)
    EVT_MENU(ID_Copy, ScenarioEditor::OnCopy)
    EVT_MENU(ID_Paste, ScenarioEditor::OnPaste)

	EVT_MENU(ID_Wireframe, ScenarioEditor::OnWireframe)
	EVT_MENU(ID_MessageTrace, ScenarioEditor::OnMessageTrace)
	EVT_MENU(ID_Screenshot, ScenarioEditor::OnScreenshot)
	EVT_MENU(ID_BigScreenshot, ScenarioEditor::OnScreenshot)
	EVT_MENU(ID_JavaScript, ScenarioEditor::OnJavaScript)
	EVT_MENU(ID_CameraReset, ScenarioEditor::OnCameraReset)
	EVT_MENU(ID_DumpState, ScenarioEditor::OnDumpState)
	EVT_MENU(ID_DumpBinaryState, ScenarioEditor::OnDumpState)
	EVT_MENU(ID_RenderPathFixed, ScenarioEditor::OnRenderPath)
	EVT_MENU(ID_RenderPathShader, ScenarioEditor::OnRenderPath)

    EVT_MENU_OPEN(ScenarioEditor::OnMenuOpen)

	EVT_TOOL(ID_ToolbarNew, ScenarioEditor::OnNew)
	EVT_TOOL(ID_ToolbarOpen, ScenarioEditor::OnOpen)
	EVT_TOOL(wxID_ANY, ScenarioEditor::OnToolbarButtons)

	EVT_IDLE(ScenarioEditor::OnIdle)
END_EVENT_TABLE()

static AtlasWindowCommandProc g_CommandProc;
AtlasWindowCommandProc& ScenarioEditor::GetCommandProc() { return g_CommandProc; }

ScenarioEditor::ScenarioEditor(wxWindow* parent)
: wxFrame(parent, wxID_ANY, _T(""), wxDefaultPosition, wxSize(1024, 768))
, m_FileHistory(_T("Scenario Editor"))
, m_ObjectSettings(g_SelectedObjects, AtlasMessage::eRenderView::GAME)
, m_ToolManager(this)
{
	m_Mgr.SetManagedWindow(this);
	
	//Load XRC
	wxXmlResource::Get()->InitAllHandlers();
	wxXmlResource::Get()->LoadAllFiles("AtlasUI");
	
	// Global application initialisation:

	wxImage::AddHandler(new wxICOHandler);

	/* "osx.openfiledialog.always-show-types: Per default a wxFileDialog with wxFD_OPEN
	   does not show a types-popup on OSX but allows the selection of files from any of
	   the supported types. Setting this to 1 shows a wxChoice for selection (if there
	   is more than one supported filetype)." */
	wxSystemOptions::SetOption(_T("osx.openfiledialog.always-show-types"), 1);	// has global effect

	// wxLog::SetTraceMask(wxTraceMessages);

	g_SelectedTexture = _T("grass1_spring");
	g_SelectedTexture.NotifyObservers();

	SetOpenFilename(_T(""));

#if defined(__WXMSW__)
	m_Icon = wxIcon(_T("ICON_ScenarioEditor")); // load from atlas.rc
#else
	{
		const wxString relativePath (_T("tools/atlas/icons/ScenarioEditor.ico"));
		wxFileName filename (relativePath, wxPATH_UNIX);
		filename.MakeAbsolute(Datafile::GetDataDirectory());
		m_Icon = wxIcon(filename.GetFullPath(), wxBITMAP_TYPE_ICO);
	}
#endif
	SetIcon(m_Icon);

	wxToolTip::Enable(true);

	wxImage::AddHandler(new wxPNGHandler);

	//////////////////////////////////////////////////////////////////////////

	// Do some early game initialisation:
	// (This must happen before constructing the GL canvas.)

	POST_MESSAGE(Init, ());

	// Wait for it to finish running Init
	qPing qry;
	qry.Post();

	//////////////////////////////////////////////////////////////////////////
	// Menu

	wxMenuBar* menuBar = wxXmlResource::Get()->LoadMenuBar(this, "AppMenu");
	SetMenuBar(menuBar);
	
	int index = menuBar->FindMenu(wxT("&File"));
	wxMenu *menuFile = menuBar->GetMenu(index);
	m_FileHistory.UseMenu(menuFile);
	m_FileHistory.AddFilesToMenu();
	
	index = menuBar->FindMenu(wxT("&Edit"));
	wxMenu *menuEdit =  menuBar->GetMenu(index);
	GetCommandProc().SetEditMenu(menuEdit);
	GetCommandProc().Initialize();

    g_SelectedObjects.RegisterObserver(0, &ScenarioEditor::OnSelectedObjectsChange, this);

	m_FileHistory.LoadFromSubDir(*wxConfigBase::Get());

	//////////////////////////////////////////////////////////////////////////
	// Toolbar
	
	/* "msw.remap: If 1 (the default), wxToolBar bitmap colours will be remapped
	 to the current theme's values. Set this to 0 to disable this functionality,
	 for example if you're using more than 16 colours in your tool bitmaps." */
	wxSystemOptions::SetOption(wxT("msw.remap"), 0); // (has global effect)
	wxToolBar* commonToolbar = wxXmlResource::Get()->LoadToolBar(this, "AppToolbar");
	commonToolbar->Realize();
	
	//////////////////////////////////////////////////////////////////////////
	// Tools Stuff
	m_ToolsMap[ID_ToolbarToolsSelect] = "";
	m_ToolsMap[ID_ToolbarToolsMove] = "TransformObject";
	m_ToolsMap[ID_ToolbarToolsAlterTerrain] = "AlterElevation";
	m_ToolsMap[ID_ToolbarToolsSmooth] = "SmoothElevation";
	m_ToolsMap[ID_ToolbarToolsFlatten] = "FlattenElevation";
	m_ToolsMap[ID_ToolbarToolsPainTerrain] = "PaintTerrain";
	
	// Set the default tool to be selected
	m_ToolManager.SetCurrentTool(_T(""));


	// Set up GL canvas:

	int glAttribList[] = {
		WX_GL_RGBA,
		WX_GL_DOUBLEBUFFER,
		WX_GL_DEPTH_SIZE, 24, // TODO: wx documentation doesn't say 24 is valid
		WX_GL_STENCIL_SIZE, 8,
		WX_GL_BUFFER_SIZE, 24, // color bits
		WX_GL_MIN_ALPHA, 8, // alpha bits
		0
	};
	Canvas* canvas = new GameCanvas(*this, this, glAttribList);
	m_Mgr.AddPane(canvas, wxCENTER);
	
#if defined(__WXMSW__)
	// The canvas' context gets made current on creation; but it can only be
	// current for one thread at a time, and it needs to be current for the
	// thread that is doing the draw calls, so disable it for this one.
	wglMakeCurrent(NULL, NULL);
#elif defined(__WXGTK__) || defined(__WXOSX__) || defined(__WXMAC__)
	// Need to make sure the canvas is realised, so that its context is valid
	// this solves the "invalid drawable" error
	Show(true);
	Raise();
#endif
#ifdef __WXGTK__
	// TODO: wxSafeYield causes issues on wxOSX 2.9, is it necessary?
	wxSafeYield();
#endif
	this->Maximize();
	// Send setup messages to game engine:

	POST_MESSAGE(InitSDL, ());

	POST_MESSAGE(SetCanvas, (static_cast<wxGLCanvas*>(canvas),
		canvas->GetClientSize().GetWidth(), canvas->GetClientSize().GetHeight()));

	POST_MESSAGE(InitGraphics, ());

	canvas->InitSize();

	// Start with a blank map (so that the editor can assume there's always
	// a valid map loaded)
	POST_MESSAGE(LoadMap, (_T("maps/scenarios/_default.xml")));
	POST_MESSAGE(SimPlay, (0.f, false));

	// Select the initial sidebar (after the map has loaded)
	//m_SectionLayout.SelectPage(_T("MapSidebar"));

	// Wait for blank map
	qry.Post();

	POST_MESSAGE(RenderEnable, (eRenderView::GAME));

	// Set up a timer to make sure tool-updates happen frequently (in addition
	// to the idle handler (which makes them happen more frequently if there's nothing
	// else to do))
	m_Timer.SetOwner(this);
	m_Timer.Start(20);
	
	m_Mgr.Update();
}

ScenarioEditor::~ScenarioEditor()
{
	m_Mgr.UnInit();
}

void ScenarioEditor::OnToolbarButtons(wxCommandEvent& event)
{
	if (event.GetId() > ID_ToolbarToolsBegin && event.GetId() < ID_ToolbarToolsEnd)
	{
		if (!event.IsChecked())
		{
			this->m_ToolManager.SetCurrentTool(_T(""));
			return;
		}

		wxToolBar* toolbar = this->GetToolBar();
		for (int i = ID_ToolbarToolsBegin + 1; i < ID_ToolbarToolsEnd; ++i)
		{
			if (i != event.GetId())
				toolbar->ToggleTool(i, false);
		}
		
		wxString toolName = m_ToolsMap[event.GetId()];
		this->m_ToolManager.SetCurrentTool(toolName);
	}
}

float ScenarioEditor::GetSpeedModifier()
{
	if (wxGetKeyState(WXK_SHIFT) && wxGetKeyState(WXK_CONTROL))
		return 1.f/64.f;
	else if (wxGetKeyState(WXK_CONTROL))
		return 1.f/4.f;
	else if (wxGetKeyState(WXK_SHIFT))
		return 4.f;
	else
		return 1.f;
}

void ScenarioEditor::OnClose(wxCloseEvent& event)
{
    if (event.CanVeto() && GetCommandProc().IsDirty())
    {
        if (wxMessageBox(_T("You have unsaved changes. Are you sure you want to quit?"), _T("Discard unsaved changes?"), wxICON_QUESTION | wxYES_NO) != wxYES)
        {
            event.Veto();
            return;
        }
	}

	m_ToolManager.SetCurrentTool(_T(""));

	m_FileHistory.SaveToSubDir(*wxConfigBase::Get());

	POST_MESSAGE(Shutdown, ());

	qExit().Post();
		// blocks until engine has noticed the message, so we won't be
		// destroying the GLCanvas while it's still rendering

	Destroy();
}


static void UpdateTool(ToolManager& toolManager)
{
	// Don't keep posting events if the game can't keep up
	if (g_FrameHasEnded)
	{
		g_FrameHasEnded = false; // (thread safety doesn't matter here)
		// TODO: Smoother timing stuff?
		static double last = g_Timer.GetTime();
		double time = g_Timer.GetTime();
		toolManager.GetCurrentTool()->OnTick(time-last);
		last = time;
	}
}
void ScenarioEditor::OnTimer(wxTimerEvent&)
{
	UpdateTool(m_ToolManager);
}
void ScenarioEditor::OnIdle(wxIdleEvent&)
{
	UpdateTool(m_ToolManager);
}

void ScenarioEditor::OnQuit(wxCommandEvent&)
{
	Close();
}

void ScenarioEditor::OnUndo(wxCommandEvent&)
{
	GetCommandProc().Undo();
}

void ScenarioEditor::OnRedo(wxCommandEvent&)
{
	GetCommandProc().Redo();
}

void ScenarioEditor::OnCopy(wxCommandEvent& WXUNUSED(event))
{
    if (GetToolManager().GetCurrentToolName() == _T("TransformObject"))
        GetToolManager().GetCurrentTool()->OnCommand(_T("copy"), NULL);
}

void ScenarioEditor::OnPaste(wxCommandEvent& WXUNUSED(event))
{
    if (GetToolManager().GetCurrentToolName() != _T("TransformObject"))
        GetToolManager().SetCurrentTool(_T("TransformObject"), NULL);

    GetToolManager().GetCurrentTool()->OnCommand(_T("paste"), NULL);
}

//////////////////////////////////////////////////////////////////////////

void ScenarioEditor::OnNew(wxCommandEvent& WXUNUSED(event))
{
	if (wxMessageBox(_("Discard current map and start blank new map?"), _("New map"), wxOK|wxCANCEL|wxICON_QUESTION, this) == wxOK)
		OpenFile(_T(""), _T("maps/scenarios/_default.xml"));
}

bool ScenarioEditor::OpenFile(const wxString& name, const wxString& filename)
{
	wxBusyInfo busy(_("Loading ") + name);
	wxBusyCursor busyc;

	AtlasMessage::qVFSFileExists qry(filename.wc_str());
	qry.Post();
	if (!qry.exists)
		return false;
	
	// Deactivate tools, so they don't carry forwards into the new CWorld
	// and crash.
	m_ToolManager.SetCurrentTool(_T(""));
	// TODO: clear the undo buffer, etc

	std::wstring map(filename.wc_str());
	POST_MESSAGE(LoadMap, (map));

	SetOpenFilename(name);

	{	// Wait for it to load, while the wxBusyInfo is telling the user that we're doing that
		qPing qry;
		qry.Post();
	}

	NotifyOnMapReload();

	GetCommandProc().ClearCommands();

	return true;
	// TODO: Make this a non-undoable command
}

// TODO (eventually): replace all this file-handling stuff with the Workspace Editor

void ScenarioEditor::OnOpen(wxCommandEvent& WXUNUSED(event))
{
	if (DiscardChangesDialog())
		return;

	MapDialog dlg (NULL, MAPDIALOG_OPEN, m_Icon);
	if (dlg.ShowModal() == wxID_OK)
	{
		wxString filename = dlg.GetFilename();
		if (!OpenFile(filename, filename))
			wxLogError(_("Map '%ls' does not exist"), filename.c_str());
	}

	// TODO: Make this a non-undoable command
}

void ScenarioEditor::OnImportHeightmap(wxCommandEvent& WXUNUSED(event))
{
	if (DiscardChangesDialog())
		return;

	wxFileDialog dlg (NULL, wxFileSelectorPromptStr,
		_T(""), _T(""),
		_T("Valid Image files|*.png;*.jpg;*.bmp|All files (*.*)|*.*"),
		wxFD_OPEN);
	// Set default filter
	dlg.SetFilterIndex(0);

	if (dlg.ShowModal() != wxID_OK)
		return;
	
	OpenFile(_T(""), _T("maps/scenarios/_default.xml"));
	
	std::wstring image(dlg.GetPath().wc_str());
	POST_MESSAGE(ImportHeightmap, (image));

	// TODO: Make this a non-undoable command
}

void ScenarioEditor::OnMRUFile(wxCommandEvent& event)
{
	wxString filename(m_FileHistory.GetHistoryFile(event.GetId() - wxID_FILE1));

	// Handle old MRU filenames
	if (filename.Mid(0, 5) != _T("maps/"))
	{
		filename = L"maps/scenarios/" + filename;
		m_FileHistory.RemoveFileFromHistory(event.GetId() - wxID_FILE1);
	}

	if (DiscardChangesDialog())
		return;

	if (!OpenFile(filename, filename))
	{
		// Missing or invalid - warn and remove from MRU
		wxLogError(_("Map '%ls' does not exist"), filename.c_str());
		m_FileHistory.RemoveFileFromHistory(event.GetId() - wxID_FILE1);
	}
}

void ScenarioEditor::OnSave(wxCommandEvent& event)
{
	if (m_OpenFilename.IsEmpty())
	{
		OnSaveAs(event);
	}
	else
	{
		wxBusyInfo busy(_("Saving ") + m_OpenFilename);
		wxBusyCursor busyc;

		// Deactivate tools, so things like unit previews don't get saved.
		// (TODO: Would be nicer to leave the tools active, and just not save
		// the preview units.)
		m_ToolManager.SetCurrentTool(_T(""));

		std::wstring map(m_OpenFilename.wc_str());
		POST_MESSAGE(SaveMap, (map));

		// Wait for it to finish saving
		qPing qry;
		qry.Post();

        GetCommandProc().MarkAsSaved();
	}
}

void ScenarioEditor::OnSaveAs(wxCommandEvent& WXUNUSED(event))
{
	MapDialog dlg(NULL, MAPDIALOG_SAVE, m_Icon);
	if (dlg.ShowModal() == wxID_OK)
	{
		wxString filename(dlg.GetFilename());
		wxBusyInfo busy(_("Saving ") + filename);
		wxBusyCursor busyc;

		m_ToolManager.SetCurrentTool(_T(""));

		std::wstring map(filename.wc_str());
		POST_MESSAGE(SaveMap, (map));

		SetOpenFilename(filename);

		// Wait for it to finish saving
		qPing qry;
		qry.Post();

        GetCommandProc().MarkAsSaved();
	}
}

void ScenarioEditor::SetOpenFilename(const wxString& filename)
{
	SetTitle(wxString::Format(_("Atlas - Scenario Editor - %s"),
		(filename.IsEmpty() ? wxString(_("(untitled)")) : filename).c_str()));

	m_OpenFilename = filename;

	if (! filename.IsEmpty())
		m_FileHistory.AddFileToHistory(filename);
}

void ScenarioEditor::NotifyOnMapReload()
{
	//m_SectionLayout.OnMapReload();

	// Notify observers, here so it's independent of individual panels
	m_MapSettings.NotifyObservers();
}

bool ScenarioEditor::DiscardChangesDialog()
{
	return GetCommandProc().IsDirty() &&
		wxMessageBox(_T("You have unsaved changes. Are you sure you want to open another map?"), _T("Discard unsaved changes?"), wxICON_QUESTION | wxYES_NO) != wxYES;
}

//////////////////////////////////////////////////////////////////////////

void ScenarioEditor::OnWireframe(wxCommandEvent& event)
{
	POST_MESSAGE(RenderStyle, (event.IsChecked()));
}

void ScenarioEditor::OnMessageTrace(wxCommandEvent& event)
{
	POST_MESSAGE(MessageTrace, (event.IsChecked()));
}

void ScenarioEditor::OnScreenshot(wxCommandEvent& event)
{
	switch (event.GetId())
	{
	case ID_BigScreenshot:
		POST_MESSAGE(Screenshot, (true, 10));
		break;
	case ID_Screenshot:
		POST_MESSAGE(Screenshot, (false, 0));
		break;
	}
}

void ScenarioEditor::OnJavaScript(wxCommandEvent& WXUNUSED(event))
{
	wxString cmd = ::wxGetTextFromUser(_T(""), _("JS command"), _T(""), this);
	if (cmd.IsEmpty())
		return;
	POST_MESSAGE(JavaScript, ((std::wstring)cmd.wc_str()));
}

void ScenarioEditor::OnCameraReset(wxCommandEvent& WXUNUSED(event))
{
	POST_MESSAGE(CameraReset, ());
}

void ScenarioEditor::OnRenderPath(wxCommandEvent& event)
{
	switch (event.GetId())
	{
	case ID_RenderPathFixed:
		POST_MESSAGE(SetViewParamS, (eRenderView::GAME, L"renderpath", L"fixed"));
		break;
	case ID_RenderPathShader:
		POST_MESSAGE(SetViewParamS, (eRenderView::GAME, L"renderpath", L"shader"));
		break;
	}
}

void ScenarioEditor::OnDumpState(wxCommandEvent& event)
{
	wxDateTime time = wxDateTime::Now();
	wxString filename;
	bool doBinary = false;

	switch (event.GetId())
	{
	case ID_DumpState:
		filename = wxString::Format(_T("sim-dump-%d.txt"), time.GetTicks());
		break;
	case ID_DumpBinaryState:
		doBinary = true;
		filename = wxString::Format(_T("sim-dump-%d.dat"), time.GetTicks());
		break;
	}

	qSimStateDebugDump q(doBinary);
	q.Post();

	std::wstring dump = *q.dump;
	wxString state(dump.c_str());

	wxFFile file(filename.c_str(), _T("w"));
	if (file.IsOpened() && !file.Error())
	{
		file.Write(state);
		file.Close();
	}
	else
	{
		wxLogError(_("Error writing to file '%ls'"), filename.c_str());
	}
}

void ScenarioEditor::OnSelectedObjectsChange(const std::vector<ObjectID>& selectedObjects)
{
    GetMenuBar()->Enable(ID_Copy, !selectedObjects.empty());
}

void ScenarioEditor::OnMenuOpen(wxMenuEvent& event)
{
    // This could be done far more elegantly if wxMenuItem had changeable id.
    wxMenu* pasteMenuItem = NULL;
    event.GetMenu()->FindItem(ID_Paste, &pasteMenuItem);

    GetMenuBar()->Enable(ID_Paste, false);

    if (!pasteMenuItem)
        return;

    wxString content;
    if (wxTheClipboard->Open())
    {
        if (wxTheClipboard->IsSupported(wxDF_TEXT))
        {
            wxTextDataObject data;
            wxTheClipboard->GetData(data);
            content = data.GetText();
        }

        wxTheClipboard->Close();
    }

    if (content.empty())
        return;

    wxInputStream* is = new wxStringInputStream(content);
    wxXmlDocument doc;
    {
        wxLogNull stopComplaining;
        static_cast<void>(stopComplaining);
        if (!doc.Load(*is))
            return;
    }

    wxXmlNode* root = doc.GetRoot();
    if (!root || root->GetName() != wxT("Entities"))
        return;

    GetMenuBar()->Enable(ID_Paste, true);
}


//////////////////////////////////////////////////////////////////////////

Position::Position(const wxPoint& pt)
: type(1)
{
	type1.x = pt.x;
	type1.y = pt.y;
}

//////////////////////////////////////////////////////////////////////////

/* Disabled (and should be removed if it turns out to be unnecessary)
   - see MessagePasserImpl.cpp for information

static void QueryCallback()
{
	// If this thread completely blocked on the semaphore inside Query, it would
	// never respond to window messages, and the system deadlocks if the
	// game tries to display an assertion failure dialog. (See
	// WaitForSingleObject on MSDN.)
	// So, this callback is called occasionally, and gives wx a change to
	// handle messages.

	// This is kind of like wxYield, but without the ProcessPendingEvents -
	// it's enough to make Windows happy and stop deadlocking, without actually
	// calling the event handlers (which could lead to nasty recursion)

// 	while (wxEventLoop::GetActive()->Pending())
// 		wxEventLoop::GetActive()->Dispatch();

	// Oh dear, we can't use that either - it (at least in wx 2.6.3) still
	// processes messages, which causes reentry into various things that we
	// don't want to be reentrant. So do it all manually, accepting Windows
	// messages and sticking them on a list for later processing (in a custom
	// event loop class):

	// (TODO: Rethink this entire process on Linux)
	// (Alt TODO: Could we make the game never pop up windows (or use the Win32
	// GUI in any other way) when it's running under Atlas, so we wouldn't need
	// to do any message processing here at all?)

#ifdef _WIN32
	AtlasEventLoop* evtLoop = (AtlasEventLoop*)wxEventLoop::GetActive();

	// evtLoop might be NULL, particularly if we're still initialising windows
	// and haven't got into the normal event loop yet. But we'd have to process
	// messages anyway, to avoid the deadlocks that this is for. So, don't bother
	// with that and just crash instead.
	// (Maybe it could be solved better by constructing/finding an event loop
	// object here and setting it as the global one, assuming it's not overwritten
	// later by wx.)

	while (evtLoop->Pending())
	{
		// Based on src/msw/evtloop.cpp's wxEventLoop::Dispatch()

		MSG msg;
		BOOL rc = ::GetMessage(&msg, (HWND) NULL, 0, 0);

		if (rc == 0)
		{
			// got WM_QUIT
			return;
		}

		if (rc == -1)
		{
			wxLogLastError(wxT("GetMessage"));
			return;
		}

		// Our special bits:

		if (msg.message == WM_PAINT)
		{
			// "GetMessage does not remove WM_PAINT messages from the queue.
			// The messages remain in the queue until processed."
			// So let's process them, to avoid infinite loops...
			PAINTSTRUCT paint;
			::BeginPaint(msg.hwnd, &paint);
			::EndPaint(msg.hwnd, &paint);
			// Remember that some painting was needed - we'll just repaint
			// the whole screen when this is finished.
			evtLoop->NeedsPaint();
		}
		else
		{
			// Add this message to a queue for later processing. (That's
			// probably kind of valid, at least in most cases.)
			MSG* pMsg = new MSG(msg);
			evtLoop->AddMessage(pMsg);
		}
	}
#endif
}
*/
void QueryMessage::Post()
{
//	g_MessagePasser->Query(this, &QueryCallback);
	g_MessagePasser->Query(this, NULL);
}
