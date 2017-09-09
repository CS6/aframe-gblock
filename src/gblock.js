import fsBase64 from './fragment-shader.glsl'
import vsBase64 from './vector-shader.glsl'

function GBlockLoader () {

  THREE.GLTFLoader.call(this)

  var self = this

  this._parse = this.parse
  this.parse = function (data, path, onLoad, onError) {
    // convert uint8 to json
    var json = JSON.parse(convertUint8ArrayToString(data))
    // use base64 shaders
    Object.keys(json.shaders).forEach(function (key, i) {
      if (key.indexOf('fragment') > -1) json.shaders[key].uri = fsBase64
      else if (key.indexOf('vertex') > -1) json.shaders[key].uri = vsBase64
    })
    // convert json to uint8
    var uint8array = new TextEncoder('utf-8').encode(JSON.stringify(json))
    // parse data
    self._parse.call(self, uint8array, path, onLoad, onError)
  }

}
GBlockLoader.prototype = THREE.GLTFLoader.prototype

// aframe module

AFRAME.registerComponent('gblock', {
  schema: {type: 'asset'},

  init: function () {
    this.model = null;
    this.loader = new GBlockLoader();
  },

  update: function () {
    var self = this;
    var el = this.el;
    var src = this.data;

    if (!src) { return; }

    this.remove();

    var id = src.split('/').pop()

    // FIXME: Replace this with an official API URL once available
    // This API call is only needed to obtain the official glTF URL of a google block model.
    // The glTF itself is not being proxied and gets fetched from https://vr.google.com/downloads/* directly.
    // https://github.com/archilogic-com/aframe-gblock/issues/1
    // API server code: server/index.js
    fetch('https://gblock.herokuapp.com/get-gltf-url/' + id).then(function (response) {

      return response.text().then(function (text) {
        if (!response.ok) throw new Error('ERROR: ' + response.status + ' "' + text + '"')

        // load glTF model from original URL
        var gltfUrl = text

        self.loader.load( gltfUrl, function gltfLoaded (gltfModel) {
          self.model = gltfModel.scene || gltfModel.scenes[0];
          // FIXME: adapt projection matrix in original shaders
          self.model.traverse(function (child) {
            if (child.material) child.material = new THREE.MeshPhongMaterial({ vertexColors: THREE.VertexColors })
          })
          self.model.animations = gltfModel.animations;
          el.setObject3D('mesh', self.model);
          el.emit('model-loaded', {format: 'gltf', model: self.model});
        });

      })
    })

  },

  remove: function () {
    if (!this.model) { return; }
    this.el.removeObject3D('mesh');
  }
});

// helpers

// from https://github.com/mrdoob/three.js/blob/master/examples/js/loaders/GLTFLoader.js
function convertUint8ArrayToString (array) {
  if (window.TextDecoder !== undefined) {
    return new TextDecoder().decode(array);
  }
  // Avoid the String.fromCharCode.apply(null, array) shortcut, which
  // throws a "maximum call stack size exceeded" error for large arrays.
  var s = '';
  for (var i = 0, il = array.length; i < il; i++) {
    s += String.fromCharCode(array[i]);
  }
  return s;
}
