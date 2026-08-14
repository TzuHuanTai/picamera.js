# Notes

## Notes on local IP or VPN address
When running PiCamera.js on a local network or VPN, set `stunUrls` to `null` or omit it.

## Notes on Mosquitto
When using Mosquitto as your MQTT server, self-signed certificates can cause issues with the PiCamera.js MQTT client. A common setup is to run Mosquitto without SSL and place nginx in front of it.

```
# mosquitto.conf
listener 1883 localhost
allow_anonymous true

listener 1884
protocol websockets
allow_anonymous true
```

Then place nginx between the browser and Mosquitto. This example assumes files are under `/home/pi/src/project` with `run/`, `ssl/`, `logs/`, and `dist/` subdirectories. It serves HTTPS on port 8443 (not 443). Adjust as needed.

```nginx
# nginx.conf
pid /home/pi/src/project/run/nginx.pid;

events {}

http {
  # Map to manage WebSocket upgrade headers
  map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
  }

  # Upstream definition for Mosquitto WebSocket listener
  upstream mosquitto_websocket {
    server localhost:1884;  # Mosquitto WebSocket listener
  }

  # HTTPS server
  server {
    listen 8443 ssl;
    access_log /home/pi/src/project/logs/access.log;
    error_log /home/pi/src/project/logs/error.log;

    ssl_certificate /home/pi/src/project/ssl/server.crt;
    ssl_certificate_key /home/pi/src/project/ssl/server.key;

    location / {
      root /home/pi/src/project/dist/;
      try_files $uri $uri/ =404;
    }

    # Location block for WebSocket proxying to Mosquitto
    location /mqtt {
      proxy_pass http://mosquitto_websocket;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection $connection_upgrade;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
  }

  # HTTP server
  server {
    listen 8080;
    access_log /home/pi/src/project/logs/access_http.log;
    error_log /home/pi/src/project/logs/error_http.log;

    location / {
      root /home/pi/src/project/dist/;
      try_files $uri $uri/ =404;
    }

    # Location block for WebSocket proxying to Mosquitto over HTTP
    location /mqtt {
      proxy_pass http://mosquitto_websocket;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection $connection_upgrade;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
  }
}
```

In this setup, initialize PiCamera.js as:

```javascript
let conn = new PiCamera({
  uid: 'some-unique-uuid',            // must match pi_webrtc's --uid argument
  mqttHost: window.location.hostname, // same host and
  mqttPort: window.location.port,     // port as page itself
  mqttPath: '/mqtt',                  // to match nginx.conf configuration
});
```

## Notes on self-signed certificates
Most browsers require HTTPS for video. With self-signed certificates, you must accept certificate warnings in advance, including for the WebSocket host/port. In the example above, open https://your.mqtt.cloud:8884/ and accept the warning first. If the browser console reports `wss://` certificate errors, open the same endpoint as `https://` and accept it.

---

Back to the [README](../README.md).
