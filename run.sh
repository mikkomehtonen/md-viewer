docker run -d -p 3100:3000 \
  --restart unless-stopped \
  --name md-viewer \
  -v /home/mikko/workspace:/workspace:ro \
  md-viewer
