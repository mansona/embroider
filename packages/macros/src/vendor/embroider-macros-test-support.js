(function() {
  var key = '_embroider_macros_runtime_config';
  if (!window[key]) {
    window[key] = [];
  }
  window[key].push(function(m) {
    m.setGlobalConfig(
      '@real_ate/fake-embroider-macros',
      Object.assign({}, m.getGlobalConfig()['@real_ate/fake-embroider-macros'], { isTesting: true })
    );
  });
})();
