const socket = io();

/* MAP */
const map = L.map("map").setView([20.5937, 78.9629], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "ankur's map",
}).addTo(map);

/* ICON */
const rider3DIcon = L.divIcon({
  className: "rider-3d-icon",
  html: `<img src="/rider-3d.png" />`,
  iconSize: [50, 50],
  iconAnchor: [25, 25],
});

/* STATE */
let myMarker = null;
let prevPos = null;
let mySocketId = null;
let myLastAngle = 0;

const others = {};

/* DISTANCE */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* BEARING */
function getBearing(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLon = toRad(lon2 - lon1);

  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.cos(dLon);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/* ANGLE SMOOTHING */
function smoothRotate(last, next) {
  let delta = next - last;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return last + delta;
}

/* SOCKET */
socket.on("connect", () => {
  mySocketId = socket.id;
});

/* GEOLOCATION */
navigator.geolocation.watchPosition(
  (pos) => {
    const { latitude, longitude } = pos.coords;

    socket.emit("send-location", { latitude, longitude });

    if (!myMarker) {
      myMarker = L.marker([latitude, longitude], {
        icon: rider3DIcon,
      }).addTo(map);

      map.setView([latitude, longitude], 16);
      prevPos = { latitude, longitude };
      return;
    }

    const distance = getDistance(
      prevPos.latitude,
      prevPos.longitude,
      latitude,
      longitude
    );

    // Ignore GPS jumps
    if (distance > 1000) {
      myMarker.setLatLng([latitude, longitude]);
      prevPos = { latitude, longitude };
      return;
    }

    const rawAngle = getBearing(
      prevPos.latitude,
      prevPos.longitude,
      latitude,
      longitude
    );

    myLastAngle = smoothRotate(myLastAngle, rawAngle);

    const img = myMarker.getElement()?.querySelector("img");
    if (img) {
      img.style.transition = "transform 0.4s linear";
      img.style.transform = `translateY(-6px) scale(1.08) rotate(${myLastAngle}deg)`;
    }

    myMarker.setLatLng([latitude, longitude]);
    prevPos = { latitude, longitude };
  },
  console.error,
  { enableHighAccuracy: true }
);

/* OTHER USERS */
socket.on("receive-location", ({ id, latitude, longitude }) => {
  if (id === mySocketId) return;

  if (!others[id]) {
    others[id] = {
      marker: L.marker([latitude, longitude], {
        icon: rider3DIcon,
      }).addTo(map),
      prev: { latitude, longitude },
      lastAngle: 0,
    };
    return;
  }

  const u = others[id];

  const distance = getDistance(
    u.prev.latitude,
    u.prev.longitude,
    latitude,
    longitude
  );

  if (distance > 1000) {
    u.marker.setLatLng([latitude, longitude]);
    u.prev = { latitude, longitude };
    return;
  }

  const rawAngle = getBearing(
    u.prev.latitude,
    u.prev.longitude,
    latitude,
    longitude
  );

  u.lastAngle = smoothRotate(u.lastAngle, rawAngle);

  const img = u.marker.getElement()?.querySelector("img");
  if (img) {
    img.style.transition = "transform 0.4s linear";
    img.style.transform = `translateY(-6px) scale(1.08) rotate(${u.lastAngle}deg)`;
  }

  u.marker.setLatLng([latitude, longitude]);
  u.prev = { latitude, longitude };
});

/* DISCONNECT */
socket.on("user-disconnected", (id) => {
  if (others[id]) {
    map.removeLayer(others[id].marker);
    delete others[id];
  }
});
