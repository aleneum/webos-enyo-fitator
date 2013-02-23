enyo.kind({
	name: "fitator.DummyStorage",
	kind: "enyo.Component",

    create: function() {
    	this.inherited(arguments);
    	this.username = 'juser';
    	this.memory = {};
        this.memory['juser'] = {value: 100, last_checked: new Date(), last_score: 10000};
    },

    setUsername: function(name) {
        name = name.toLowerCase();
        if (name.length > 0) {
            if ((name in this.memory)==false) {
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
        enyo.log("mock. does not do anything.");
    },

    clearData: function() {
        this.memory = {};
        this.username = '';
    }
});