enyo.kind({
  name: "fitator.App",
  kind: enyo.VFlexBox,
  components: [
  {name: "getFeed", kind: "WebService", onSuccess: "gotFeed", onFailure: "gotFeedFailure"},
  {name: "storage", kind: "fitator.WebOSStorage"},
  {name : "makeSysSound", kind : "PalmService", service : "palm://com.palm.audio/systemsounds",
  method : "playFeedback"},
  {kind: "AppMenu", components: [
    {caption: "Clear Records", onclick: "clearRecords"},
  ]},
  {kind:"Control", name:"title", content: "Fitator"},
  {name:"topGroup", kind:"Control", layoutKind: "HFlexLayout", components: [
    {name: "iconImage", kind: "Image", src: "images/icon.png", imageHeight: 150},
    {kind: "RowGroup", caption: "Preferences", flex:3, components: [
      {name: "nameField", kind: "Input", selectAllOnFocus: true,
      focusClassName: "fieldFocused",hint: "Your Username", autoCapitalize:"lowercase"},
      {name: "pwField", kind: "PasswordInput", selectAllOnFocus: true, 
      focusClassName: "fieldFocused", hint: "Your Password"}
    ]}
  ]},
  {kind: "Control", name: "statusLabel", content: "Hello :)"},
  {kind: "RowGroup", caption: "Status", components: [
    {name: "scoreLabel", content: "Score: "},
    {name: "lastCheckedLabel", content: "LastChecked: "}
  ]},
  {name: "buttonBox", kind: "Control", layoutKind: "HFlexLayout", components:[
    {name: "timerButton", kind: "IconButton", icon:"images/timer.png", onclick: "timerButtonClicked", toggling: "true"},
    {name: "onceButton", kind: "IconButton", icon:"images/once.png", onclick: "onceButtonClicked"},
    {kind: "Picker", name: "valueField" , label: "value", items: [
      {caption: "1", value: "1"},
      {caption: "5", value: "5"},
      {caption: "10", value: "10"},
      {caption: "20", value: "20"},
      {caption: "50", value: "50"},
      {caption: "100", value: "100"}
    ]},
    {name: "scoreField", kind: "Input", selectAllOnFocus: true, flex: 1,
      focusClassName: "fieldFocused",hint: "your score", autoCapitalize:"lowercase"},
    {name: "submitButton", kind: "IconButton", icon:"images/lift.png", onclick: "submitButtonClicked"}
  ]}
  ],

create: function() {
    this.inherited(arguments); 
    this.session_state = 0;
  // give the storage some time for fire up 
  setTimeout(enyo.bind(this, this.initalizeInterface), 500);
},

initalizeInterface: function() {
  if (this.$.storage.getUsername().length > 0) {
    this.$.nameField.setValue(this.$.storage.getUsername());
  } else {
    this.$.nameField
  }
  this.$.scoreLabel.setContent("Score: " + this.$.storage.getScore());
  var checked = "Never"
  if (this.$.storage.getLastChecked() != -1) {
    checked = this.$.storage.getLastChecked();
  }
  this.$.lastCheckedLabel.setContent("Last Checked: " + checked);
},

submitButtonClicked: function() {
  this._gotFeed();
  //var url = "https://www.fitocracy.com";
  //this.$.getFeed.setUrl(url);
  //this.$.getFeed.call();
},

_gotFeed: function() {
  var score = this.$.scoreField.getValue();
  score = parseInt(score.replace(/[^0-9]/g,''));
  this.$.storage.setUsername(this.$.nameField.getValue());
  this.conductUpdate(score);
},

conductUpdate: function(score) {
  this.$.storage.setUsername(this.$.nameField.getValue());
  var old_score = this.$.storage.getScore();
  var old_time = this.$.storage.getLastChecked();
  var new_time = new Date();
  var diff = this.$.storage.updateScore(score, new_time);
  this.$.storage.saveData();
  this.$.scoreLabel.setContent("Score: " + this.$.storage.getScore());
  this.$.lastCheckedLabel.setContent("Last Checked: " + this.$.storage.getLastChecked());
  if (old_time == -1) {
    comment = "We are set. You get 42 points for free. Start training now to earn more.";
    this.$.statusLabel.setContent(comment);
    return;
  }
  var days = Math.round((new_time - old_time)  / (1000*60*60*24));
  if (days == 0) days = 1;
  var each = diff/days;
  var comment = "Lame...";      
  if (each > 1000) {
    comment = "Wow! What an ace!";
  } else if (each > 800) {
    comment = "Awesome! That was some serious training.";
  } else if (each > 600) {
    comment = "Nice! You like sports, don't you?"
  } else if (each > 400) {
    comment = "Good work. Keep it up."
  } else if (each > 200) {
    comment = "Not bad. But can you do better?"
  } else if (each > 100) {
    comment = "It's something."
  }
  this.$.statusLabel.setContent("You earned " + diff + " points. That is " + each + " each day. " + comment);
},

gotFeed: function(inSender, inResponse) {
  if (this.session_state < 1) {
    enyo.log("Get Session");
    if (/<title>.*Home.*<\/title>/.test(inResponse) == true) {
      this.session_state = 2;
      this.$.getFeed.setUrl("https://www.fitocracy.com/profile/" + this.$.nameField.getValue());
      this.$.getFeed.call();
      return;
    }
    var anchor = "'csrfmiddlewaretoken' value='";
    var idx = inResponse.indexOf(anchor);
    idx += anchor.length
    var token = inResponse.substring(idx,idx+32);
    this.$.getFeed.setUrl("https://www.fitocracy.com/accounts/login/");
    this.$.getFeed.setMethod("POST");
    this.session_state = 1;
    this.$.getFeed.setHeaders({
     "Referer": "https://www.fitocracy.com/",
     "Origin": "https://www.fitocracy.com"
    });
    this.$.getFeed.setUsername(this.$.nameField.getValue());
    this.$.getFeed.setPassword(this.$.pwField.getValue());
    this.$.getFeed.call({
     csrfmiddlewaretoken: token,
     is_username: "1",
     json: "1",
     next: "/profile/" + this.$.nameField.getValue() + "/",
     username: this.$.nameField.getValue(),
     password: this.$.pwField.getValue()
    });
    //xhr = new XMLHttpRequest();
    // var params = "csrfmiddlewaretoken="+token+"&is_username=1&json=1&username=juser&password=hallo";
    // xhr.open("POST", "https://www.fitocracy.com/accounts/login/", false);
    // xhr.setRequestHeader("Origin", "http://google.com");
    // xhr.setRequestHeader("Referer", "http://www.fitocracy.com");
    //file://.media.cryptofs.app.usr.palm.applications.com.palm.feedreader
    //xhr.setRequestHeader("Content-Type", "application/xml");
    //xhr.setRequestHeader("Accept", "*/*");
    //xhr.setRequestHeader("Accept-Charset", "ISO-8859-1,utf-8;q=0.7,*;q=0.3");
    //xhr.send(params);
    //enyo.log(xhr.responseText);
    //enyo.log(xhr.status);
    this.session_state = 1;
  } else if (this.session_state < 2) {
    enyo.log("Auth");
    this.$.getFeed.setMethod("GET");
    if (inResponse.success == true) {
      this.$.getFeed.setUrl("https://www.fitocracy.com/profile/" + this.$.nameField.getValue() + "/");
      this.session_state = 2;
      this.$.getFeed.call();
    } else {
      this.$.statusLabel.setContent(inResponse.error);
      this.session_state = 0;
    }
  } else if (this.session_state < 3){
    enyo.log("Set Score");
    var idx = inResponse.indexOf("stat-points");
    var sub = inResponse.substring(idx,idx+200);
    var arr = sub.split('\n');
    for (var el in arr) {
      if (arr[el].indexOf(">") < 0) {
        var new_score = parseInt(arr[el].replace(/[^0-9]/g,''));
        this.conductUpdate(new_score);
        break;
      }
    }
    this.$.getFeed.setUrl("https://www.fitocracy.com/accounts/logout/");
    this.$.getFeed.setMethod("GET");
    this.session_state = 3;
    this.$.getFeed.call();
  } else {
    this.session_state = 0
  }
},

gotFeedFailure: function(inSender, inResponse, inRequest) {
  this.$.statusLabel.setContent("something went wrong :(.");
  enyo.log(inRequest.xhr.status);
},

clearRecords: function() {
  this.$.storage.clearData();
  this.$.statusLabel.setContent("Okay. All records are gone.");
},

onceButtonClicked:function() {
  var invalid = /[^0-9]/i.test(this.$.valueField.getValue());
  if (invalid == false) {
    var value = parseInt(this.$.valueField.getValue());
    var old_score = this.$.storage.getScore();
    var new_score = this.$.storage.reduceScore(value);
    if ( new_score == 0 || (old_score * new_score < 0)) {
      this.$.statusLabel.setContent("Uhoh. No points left!");
      this.$.makeSysSound.call({name: "sysmgr_alert"});
    }
    this.$.scoreLabel.setContent("Score: " + new_score);
  } else {
    this.$.statusLabel.setContent("OOps. Only numbers allowed in value field.");
    if (this.$.timerButton.depressed == true) {
      clearInterval(this.timer);
      this.$.valueField.setDisabled(false);
      this.$.onceButton.setDisabled(false);
      this.$.timerButton.setDepressed(false);
    }
  }
  this.$.storage.saveData();
},

timerButtonClicked:function() {
  if (this.$.timerButton.depressed == true) {
    this.$.valueField.setDisabled(true);
    this.$.onceButton.setDisabled(true);
    this.timer = setInterval(enyo.bind(this, this.onceButtonClicked), 60000);
    this.onceButtonClicked();
  } else {
    clearInterval(this.timer);
    this.$.valueField.setDisabled(false);
    this.$.onceButton.setDisabled(false);
  }
}
});
