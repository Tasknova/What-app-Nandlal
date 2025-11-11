#!/bin/bash

echo "Starting WhatsApp Business Hub Development Environment..."
echo

echo "Starting Proxy Server on port 3001..."
gnome-terminal --title="Proxy Server" -- bash -c "node proxy-server.js; exec bash" &

echo "Waiting 3 seconds for proxy server to start..."
sleep 3

echo "Starting Frontend Development Server on port 5173..."
gnome-terminal --title="Frontend Dev Server" -- bash -c "npm run dev; exec bash" &

echo
echo "Development environment started!"
echo
echo "Frontend: http://localhost:5173"
echo "API Proxy: http://localhost:3001"
echo
echo "Both servers are now running in separate terminals."
echo "Close the terminals to stop the servers."
