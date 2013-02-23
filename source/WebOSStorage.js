enyo.kind({
	name: "fitator.WebOSStorage",
	kind: "enyo.Component",
    components: [
		{kind: "DbService", dbKind: "com.github.fitator:1", onFailure: "handleFailure",
    	components: [
      		{name: "loadData", method: "find", onSuccess: "handleLoadData"},
      		{name: "storeData", method: "put", onSuccess: "handleStoreData"},
      		{name: "registerKind", method: "putKind", onSuccess: "handleRegisterKind"},
      		{name: "removeKind", method: "delKind", onSuccess: "handleRemoveKind"}
    	]},
    ],

    create: function() {
    	this.inherited(arguments);
    	this.username = '';
    	this.memory = {};
    	this.$.loadData.call();
    },

    setUsername: function(name) {
    	name = name.toLowerCase();
    	if (name.length > 0) {
    		if ((name in this.memory)==false) {
    			enyo.log("create template");
    			this.memory[name]= {value: 0, last_checked:-1, last_score:0}
    		}
    	}
    	this.username = name;
    },

    updateScore: function(new_score, new_checked) {
        var diff = 0;
        if (this.username.length > 0) {
            if (this.memory[this.username].last_checked != -1) {
                diff = new_score - this.memory[this.username].last_score;
                this.memory[this.username].value += diff;
            } else {
                this.memory[this.username].value = 42;
            }
            this.memory[this.username].last_checked = new_checked;
            this.memory[this.username].last_score = new_score;
        }
        return diff;
    },

    getUsername: function() {
    	return this.username;
    },

    getScore: function() {
        if (this.username.length >0) {
    	   return this.memory[this.username].value;
        }
        return 0;
    },

    reduceScore: function(val) {
        if (this.username.length > 0) {
            this.memory[this.username].value -= val;
            return this.memory[this.username].value;
        }
        return 0;
    },

    getLastChecked: function() {
        if (this.username.length >0) {
    	   return this.memory[this.username].last_checked;
        }
        return -1;
    },

    saveData: function() {
    	enyo.log("save data");
    	this.$.removeKind.call();
    },

    clearData: function() {
        this.memory = {};
        this.username = '';
        this.$.removeKind.call();
    },

    handleFailure: function(inSender, inResponse) {
        switch(inResponse.errorCode) {
        // kind not registered yet
        // #TODO: maybe here we want to show a brief introduction
        case -3970:
            enyo.log("Kind is not known. Register it.");
            this.$.registerKind.call({owner: enyo.fetchAppId()});
            this.$.loadData.call();
            break;
        // The handlers will take care of that.
        case -3965:
            enyo.log(inResponse);
            break
        default:
            enyo.log(inResponse);
            break;
        };
    },

    handleLoadData: function(inSender, inResponse) {
        if (inResponse.resultValue == false) return;
        var name = '';
        for (var i=0; i < inResponse.results.length; i++) {
            el = inResponse.results[i];
            if (el.name == "username") {
                name = el.value;
            } else if (el.name == "score") {
                this.memory[el.user] = {value: el.value, last_checked: new Date(el.last_checked),
                    last_score: el.last_score};
            }
        }
        this.setUsername(name);
    },

    handleStoreData: function(inSender, inResponse) {
    	enyo.log("Data stored");
    },

    handleRemoveKind: function(inSender, inResponse) {
        this.$.registerKind.call({owner: enyo.fetchAppId()});
        var obj = [];
        if (this.username.length > 0) {
    	  obj.push({_kind: this.$.dbService.dbKind, name: "username", value: this.username});
        }
    	for (key in this.memory) {
    		obj.push({_kind: this.$.dbService.dbKind, name:"score", user: key, value: this.memory[key].value, 
    			last_checked: this.memory[key].last_checked, last_score: this.memory[key].last_score});
    	}
        if (obj.length > 0) this.$.storeData.call({objects:obj});
    },

    handleRegisterKind: function(inSender, inResponse) {
    	enyo.log("kind registered");
    }

});