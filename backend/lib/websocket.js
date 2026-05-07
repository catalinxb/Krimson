let broadcaster = () => {};

function setBroadcaster(fn) {
  broadcaster = fn;
}

function broadcast(data) {
  broadcaster(data);
}

module.exports = {
  setBroadcaster,
  broadcast,
};