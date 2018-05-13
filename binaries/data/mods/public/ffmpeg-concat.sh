ffmpeg -start_number 0 -framerate 15 -i "screenshots/screenshot%04d.jpeg" -c:v libx264 -crf 15 -vf scale=-2:1080 trailer_crf15.mp4
