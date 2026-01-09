const socket = io();

const map = L.map("map").setView([20.5937, 78.9629], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "ankur's map",
}).addTo(map);

const otherMarkers = {};
let myMarker = null;
let mySocketId = null;

socket.on("connect", () => {
  mySocketId = socket.id;
});

if (navigator.geolocation) {
  navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;

      // Send location to server
      socket.emit("send-location", { latitude, longitude });

      // Draw / update my marker ONLY ON THIS TAB
      if (!myMarker) {
        myMarker = L.marker([latitude, longitude]).addTo(map);
        map.setView([latitude, longitude], 15);
      } else {
        myMarker.setLatLng([latitude, longitude]);
      }
    },
    (err) => console.error(err),
    { enableHighAccuracy: true }
  );
}

// Receive OTHER users' locations
socket.on("receive-location", ({ id, latitude, longitude }) => {
  // Never draw yourself again
  if (id === mySocketId) return;

  if (!otherMarkers[id]) {
    otherMarkers[id] = L.marker([latitude, longitude]).addTo(map);
  } else {
    otherMarkers[id].setLatLng([latitude, longitude]);
  }
});

// Remove marker when user disconnects
socket.on("user-disconnected", (id) => {
  if (otherMarkers[id]) {
    map.removeLayer(otherMarkers[id]);
    delete otherMarkers[id];
  }
});
