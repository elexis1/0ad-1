ffmpeg -start_number 0 -framerate 30 -i "screenshots/screenshot%04d.png" -c:v libx264 -crf 15 trailer_crf15.mp4
