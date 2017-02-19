const FBSDK = require('react-native-fbsdk');
const {
  LoginButton,
  AccessToken
} = FBSDK;
import React, { Component } from 'react';
import {AWSCognitoCredentials} from 'aws-sdk-react-native-core';
import MQTTDisplay from './MQTTDisplay';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  NativeModules,
  NativeAppEventEmitter
} from 'react-native';
var fbookToken = '1339370646130788'
var supplyLogins = false;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5FCFF',
    padding: 20
  },
  fbButton: {
    borderColor: '#2d5073',
    backgroundColor: '#3b5998',
  },
  attribute: {
    fontSize: 5
  }
});

var region = "us-east-1";
var identity_pool_id = "us-east-1:955a584d-5cd3-4358-a8ab-24d809555a10";

class BaikalLogin extends Component{
  constructor(props) {
    super(props);
    this.state = {
      loginMessage: 'Log Into Facebook',
      Authenticated:'False',
      identityID: '',
      AccessKey:'',
      SecretKey:'',
      SessionKey:'',
      Expiration:'',
      isLoggedIn: false
    };
    AWSCognitoCredentials.identityChanged = function(Previous,Current){
      console.log("PreviousID: " + Previous);
      console.log("CurrentID: " + Current);
    }
    AWSCognitoCredentials.getLogins = function(){
      if(supplyLogins){
        var map = {};
        map[AWSCognitoCredentials.RNC_FACEBOOK_PROVIDER] = fbookToken;
        return map;
      }else{
        return "";
      }
    };
    AWSCognitoCredentials.initWithOptions({"region":region,"identity_pool_id":identity_pool_id})
  }
  componentDidMount() {
    this.Refresh();
  }
  Refresh(){
    var that = this;
    async function getCredAndID(){
      try{
        var variable = await AWSCognitoCredentials.getCredentialsAsync();
        that.setState({AccessKey:variable["AccessKey"],SecretKey:variable["SecretKey"],
        SessionKey:variable["SessionKey"],Expiration:variable["Expiration"].toString(), isLoggedIn: true});
        variable = await AWSCognitoCredentials.getIdentityIDAsync();
        that.setState({identityID:variable.identityid});
      }catch(e){
        console.log("Error: " + e)
        return;
      }
    }
    getCredAndID();
    AWSCognitoCredentials.isAuthenticated(function(error, variable){
      if(error){
        console.log("Error: " + error)
      }else{
        if (variable) {
          that.setState({Authenticated:"True"});
        }else{
          that.setState({Authenticated:"False"});
        }
      }
    });
  }
  ClearCred(){
    AWSCognitoCredentials.clearCredentials();
  }
  ClearKeychain(){
    AWSCognitoCredentials.clear();
  }
  onLoginInvoked(isLoggingIn, Accesstoken){
    that = this;
    if(isLoggingIn){
      fbookToken = Accesstoken;
      supplyLogins = true;
      var map = {};
      map[AWSCognitoCredentials.RNC_FACEBOOK_PROVIDER] = fbookToken;
      AWSCognitoCredentials.setLogins(map); //ignored for iOS
      return;
    }else{
      supplyLogins = false;
    }
  }
  render() {
    return (
      <View style={styles.container}>
      <LoginButton
      onLoginFinished={
        (error, result) => {
          if (error) {
            alert("login has error: " + result.error);
          } else if (result.isCancelled) {
            alert("login is cancelled.");
          } else {
            AccessToken.getCurrentAccessToken().then(
              (data) => {
                this.onLoginInvoked(true,data.accessToken.toString());
                this.Refresh();
              }
            )
          }
        }
      }
      onLogoutFinished={() => this.onLoginInvoked(false,"")}/>
        {this.state.isLoggedIn && <View>
          <MQTTDisplay SecretKey={this.state.SecretKey}
                       AccessKey={this.state.AccessKey}
                       SessionKey={this.state.SessionKey}/>
        </View>}
      </View>
    );
  }
}

module.exports = BaikalLogin;
