// The Pages service binding forwards the original host, cookies, method and body.
export default {
  fetch(request, env) {
    return env.DARAK.fetch(request);
  },
};
