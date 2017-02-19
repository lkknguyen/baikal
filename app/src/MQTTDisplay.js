import React from 'react';
import {
  View,
  Text
} from 'react-native';
import MQTTHelper from './MQTTHelper';

class MQTTDisplay extends React.Component {
  constructor(props) {
    super(props);
    this.mqttHelper = new MQTTHelper(props.AccessKey, props.SecretKey, props.SessionKey);
    this.state = { messages: [] };
  }
  componentDidMount() {
    this.mqttHelper.client.connect();
    this.mqttHelper.client.on('connected', () => {
      console.log('connected');
      this.mqttHelper.client.subscribe('topic_1');
      this.mqttHelper.client.on('messageArrived', (msg) => {
        console.log(msg);
      })
    });
    this.mqttHelper.client.on('connectionLost', () => {
      console.log('connection lost');
    })
  }
  render() {
    return (
      <View>
        <Text>{this.props.SecretKey}</Text>
        <Text>{this.props.AccessKey}</Text>
      </View>
    );
  }
}

module.exports = MQTTDisplay;