import React from 'react';
import MQTTClient from './MQTTClient';

const AWS_IOT_ENDPOINT_HOST = 'a3905jungeyts4.iot.us-east-1.amazonaws.com';

class MQTTHelper {
  client;
  constructor(accessKey, secretKey, sessionKey) {
    this.client = new MQTTClient({
      accessKey: accessKey,
      secretKey: secretKey,
      endpoint: AWS_IOT_ENDPOINT_HOST,
      regionName: 'us-east-1',
      clientId: 'kyle'
    });
  }
}

module.exports = MQTTHelper;