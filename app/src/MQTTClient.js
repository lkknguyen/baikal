'use strict';
import { Client } from 'react-native-paho-mqtt';
import moment from 'moment';
import CryptoJS from 'crypto-js';

/**
 * utilities to do sigv4
 * @class SigV4Utils
 */
function SigV4Utils(){}

SigV4Utils.sign = function(key, msg){
  var hash = CryptoJS.HmacSHA256(msg, key);
  return hash.toString(CryptoJS.enc.Hex);
};

SigV4Utils.sha256 = function(msg) {
  var hash = CryptoJS.SHA256(msg);
  return hash.toString(CryptoJS.enc.Hex);
};

SigV4Utils.getSignatureKey = function(key, dateStamp, regionName, serviceName) {
  var kDate = CryptoJS.HmacSHA256(dateStamp, 'AWS4' + key);
  var kRegion = CryptoJS.HmacSHA256(regionName, kDate);
  var kService = CryptoJS.HmacSHA256(serviceName, kRegion);
  var kSigning = CryptoJS.HmacSHA256('aws4_request', kService);
  return kSigning;
};

/**
 * AWS IOT MQTT Client
 * @class MQTTClient
 * @param {Object} options - the client options
 * @param {string} options.endpoint
 * @param {string} options.regionName
 * @param {string} options.accessKey
 * @param {string} options.secretKey
 * @param {string} options.clientId
 * @param {angular.IScope}  [scope]  - the angular scope used to trigger UI re-paint, you can
 omit this if you are not using angular
 */
class MQTTClient {
  constructor(options, scope) {
    this.storage = {
      setItem: (key, item) => {
        myStorage[key] = item;
      },
      getItem: (key) => myStorage[key],
      removeItem: (key) => {
        delete myStorage[key];
      },
    };
    this.options = options;
    this.scope = scope;

    this.endpoint = this.computeUrl();
    this.clientId = options.clientId;
    this.name = this.clientId + '@' + options.endpoint;
    this.connected = false;
    this.client = new Client({ uri: this.endpoint, clientId: this.clientId, storage: this.storage });
    this.listeners = {};
    var self = this;
    this.client.onConnectionLost = function() {
      self.emit('connectionLost');
      self.connected = false;
    };
    this.client.onMessageArrived = function(msg) {
      self.emit('messageArrived', msg);
    };
    this.on('connected', function(){
      self.connected = true;
    });
  }

  computeUrl() {
    // must use utc time
    var time = moment.utc();
    var dateStamp = time.format('YYYYMMDD');
    var amzdate = dateStamp + 'T' + time.format('HHmmss') + 'Z';
    var service = 'iotdevicegateway';
    var region = this.options.regionName;
    var secretKey = this.options.secretKey;
    var accessKey = this.options.accessKey;
    var algorithm = 'AWS4-HMAC-SHA256';
    var method = 'GET';
    var canonicalUri = '/mqtt';
    var host = this.options.endpoint;

    var credentialScope = dateStamp + '/' + region + '/' + service + '/' + 'aws4_request';
    var canonicalQuerystring = 'X-Amz-Algorithm=AWS4-HMAC-SHA256';
    canonicalQuerystring += '&X-Amz-Credential=' + encodeURIComponent(accessKey + '/' + credentialScope);
    canonicalQuerystring += '&X-Amz-Date=' + amzdate;
    canonicalQuerystring += '&X-Amz-Expires=86400';
    canonicalQuerystring += '&X-Amz-SignedHeaders=host';

    var canonicalHeaders = 'host:' + host + '\n';
    var payloadHash = SigV4Utils.sha256('');
    var canonicalRequest = method + '\n' + canonicalUri + '\n' + canonicalQuerystring + '\n' + canonicalHeaders + '\nhost\n' + payloadHash;

    var stringToSign = algorithm + '\n' +  amzdate + '\n' +  credentialScope + '\n' +  SigV4Utils.sha256(canonicalRequest);
    var signingKey = SigV4Utils.getSignatureKey(secretKey, dateStamp, region, service);
    var signature = SigV4Utils.sign(signingKey, stringToSign);

    canonicalQuerystring += '&X-Amz-Signature=' + signature;
    var requestUrl = 'wss://' + host + canonicalUri + '?' + canonicalQuerystring;
    return requestUrl;
  }
  on(event, handler) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
  }
  emit(event) {
    var listeners = this.listeners[event];
    if (listeners) {
      var args = Array.prototype.slice.apply(arguments, [1]);
      for (var i = 0; i < listeners.length; i++) {
        var listener = listeners[i];
        listener.apply(null, args);
      }
      // make angular to repaint the ui, remove these if you don't use angular
      if(this.scope && !this.scope.$$phase) {
        this.scope.$digest();
      }
    }
  }
  connect() {
    var self = this;
    var connectOptions = {
      onSuccess: function(){
        console.log('hi');
        self.emit('connected');
      },
      useSSL: true,
      timeout: 3,
      mqttVersion:4,
      onFailure: function() {
        self.emit('connectionLost');
      }
    };
    this.client.connect(connectOptions);
  }
  disconnect() {
    this.client.disconnect();
  }
  publish(topic, payload) {
    try {
      var message = new Paho.MQTT.Message(payload);
      message.destinationName = topic;
      this.client.send(message);
    } catch (e) {
      this.emit('publishFailed', e);
    }
  }
  subscribe(topic) {
    var self = this;
    try{
      this.client.subscribe(topic, {
        onSuccess: function(){
          self.emit('subscribeSucess');
        },
        onFailure: function(){
          self.emit('subscribeFailed');
        }
      });
    }catch(e) {
      this.emit('subscribeFailed', e);
    }
  }
}

module.exports = MQTTClient;