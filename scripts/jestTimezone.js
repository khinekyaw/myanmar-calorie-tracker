// Jest globalSetup: every test runs on Myanmar time (the app's users, and the
// server's day boundaries), whatever the machine's own time zone is. A time
// zone set inside a test file doesn't reach Node's clock.
module.exports = () => {
  process.env.TZ = 'Asia/Yangon';
};
