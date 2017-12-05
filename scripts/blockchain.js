//global variable
global_config = {
    difficulty: 3,      //hashing difficulty
    timeout: 10000,     //in milliseconds
    langugage: 1,       //1 -> Javascript; 2-> Java
    url: "http://localhost:8080/Blockchain/MineBlockServlet"    //url for Java servlet
}

var app = angular.module('BlockChain', []);

//service for block chain
app.service("BlockChainService", ['$http', '$timeout', 'UIHelperService', function ($http, $timeout, UIHelperService) {
    var blocks = [],    //stores all the Blocks in the blockchain
        options = [{ value: 1, name: "Javascript Implementation" }, { value: 2, name: "Java Implementation" }];     //popup language select options

    //getters for blocks and options
    this.getOptions = function () { return options; }
    this.getBlocks = function () { return blocks; }

    //structure for individual block
    var Block = function () {
        this.id = "";       //stores UUID
        this.nonce = 0;     //stores the nonce (for calculating hash)
        this.data = "";     //stores block data
        this.mine_time = null;          //stores time taken to mine || updates status in the block view
        this.mine_action_perf = false;  //signifies that mining action has been performed, successfully or unsuccessfully
        this.good_block = false;        //signifies that mining action was complete or not
        this.parentID = 0;              //stores hash of parent
        this.parentMined = false;       //signifies that parent has been mined or not
        this.hash = null;               //stores hash 
    }

    //methods for each block
    Block.prototype = {
        createBlock: function () {
            this.id = this.generateUUID();
            this.hash = this.generateHash();
        },

        generateHash: function () {
            return sha256(this.id + this.nonce + this.data + this.parentID);
        },

        generateUUID: function () {
            var d = new Date().getTime();
            var uuid = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/[x]/g, function (c) {
                var r = (d + Math.random() * 16) % 16 | 0;
                d = Math.floor(d / 16);
                return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
            });
            return uuid;
        },

        mine: function (difficulty) {
            var start = new Date().getTime(), currtime;
            var str = "";
            for (var i = 0; i < difficulty; i++) str += "0";

            while (this.hash.substr(0, difficulty) !== str) {
                this.nonce++;
                this.hash = this.generateHash();
                currtime = new Date().getTime();
                if (currtime - start > global_config.timeout) {
                    this.mine_action_perf = true;
                    this.good_block = false;
                    this.mine_time = "Timeout. Mine for more time";
                    return;
                }
            }

            var end = new Date().getTime();
            this.mine_time = (end - start) + " ms";
            this.good_block = true;
            this.mine_action_perf = true;
        }
    }

    //handler for create block button
    this.createBtnClickHandler = function (e) {
        var new_block = new Block();
        new_block.createBlock();

        //genesis block condition
        if (blocks.length == 0) {
            blocks.push(new_block);
            return;
        }

        new_block.parentID = blocks[blocks.length - 1].hash;
        new_block.parentMined = blocks[blocks.length - 1].mine_action_perf && blocks[blocks.length - 1].good_block;
        blocks.push(new_block);
    }

    //handler for settings button
    this.saveBtnClickHandler = function (elements) {
        var diff = elements[0], //entered difficulty
            curr_diff = global_config.difficulty,   //current difficulty
            timeout = elements[1],  
            lang_val = elements[2], 
            url = elements[3];

        //updating global variable 
        global_config.difficulty = !isNaN(diff) ? diff : global_config.difficulty;
        global_config.timeout = !isNaN(timeout) ? timeout : global_config.timeout;
        global_config.langugage = !isNaN(lang_val) ? lang_val : global_config.langugage;
        global_config.url = url;

        //blocks are reset only if difficulty is changed
        if (curr_diff != global_config.difficulty)
            this.resetAllBlocks();
    }

    //resets all the blocks to initial state
    this.resetAllBlocks = function () {
        for (var i = 0; i < blocks.length; i++) {
            blocks[i].nonce = 0;
            blocks[i].mine_time = null;
            blocks[i].mine_action_perf = false;
            blocks[i].good_block = false;
            blocks[i].hash = blocks[i].generateHash();
            blocks[i].parentMined = false;

            if (i != blocks.length - 1)
                blocks[i + 1].parentID = blocks[i].hash;
        }
    }
    
    //constructs json with data for sending to any server
    this.constructJsonData = function (index) {
        return {
            block: blocks[index].id,
            parent: blocks[index].parentID,
            data: blocks[index].data,
            hash: blocks[index].hash,
            nonce: blocks[index].nonce,
            difficulty: global_config.difficulty,
            timeout: global_config.timeout
        }
    }

    //using javascript to find solution for set difficulty
    this.findHashUsingJS = function (index, elements, enableActions, callback) {
        //setting timeout to try making it async on the javascript end. doesn't help much though. thus, display freezes when difficulty is higher
        $timeout(function () {
            blocks[index].mine(global_config.difficulty);
            if (index < blocks.length - 1) {
                if (blocks[index + 1])
                    blocks[index + 1].parentID = blocks[index].hash;

                if (blocks[index].good_block && blocks[index + 1])
                    blocks[index + 1].parentMined = true;
            }
            enableActions(elements);
            callback();
        }, 0);
    }

    //using external service to find the solution
    this.findHashUsingExternalService = function (index, elements, enableActions, callback) {
        var data_json = this.constructJsonData(index);

        $http({
            method: 'POST',
            url: global_config.url,
            contentType: 'application/json',
            data: JSON.stringify(data_json)
        }).then(
        //callback if async call is successfull
        function (response) {
            blocks[index].mine_action_perf = true;
            if (response.data["status"]) {
                blocks[index].good_block = true;
                blocks[index].mine_time = response.data["time"] + " ms";
                blocks[index].hash = response.data["hash"];
                blocks[index].nonce = response.data["nonce"];

                if (blocks[index + 1])
                    blocks[index + 1].parentMined = true;
            }
            else {
                //timed out
                blocks[index].nonce = response.data["nonce"];
                blocks[index].good_block = false;
                blocks[index].mine_time = "Timeout. Mine for more time";
                if (blocks[index + 1])
                    blocks[index + 1].parentMined = false;
            }

            if (index < blocks.length - 1 && blocks[index + 1]) {
                blocks[index + 1].parentID = blocks[index].hash;
            }
            enableActions(elements);
            callback();
        },
         //callback if async call had errors
        function (response) {
            blocks[index].good_block = false;
            blocks[index].mine_action_perf = true;
            blocks[index].mine_time = "Error connecting to server";

            if (blocks[index + 1])
                blocks[index + 1].parentMined = false;

            enableActions(elements);
            callback();
        });
    }

    //mine button handler 
    this.mineBtnClickHandler = function (e, index, callback) {
        //does not mine if parent is not mined, unless if block is genesis block
        if (index > 0 && !blocks[index].parentMined) return;

        var elements = UIHelperService.getElements(e);
        UIHelperService.disableActions(elements);

        if (global_config.langugage == 1) {
            this.findHashUsingJS(index, elements, UIHelperService.enableActions, callback);
        }
        else if (global_config.langugage == 2) {
            this.findHashUsingExternalService(index, elements, UIHelperService.enableActions, callback);
        }
    }

    //handler for key up event
    this.onKeyUpHandler = function (e, index) {
        blocks[index].data = e.target.value;
        this.propagateChange(index);
        blocks[index].good_block = false;
    }

    //invalidates rest of the chain from given index of the blockchain
    this.propagateChange = function (index) {
        for (var i = index; i < blocks.length - 1; i++) {
            blocks[i].hash = blocks[i].generateHash();
            blocks[i + 1].parentID = blocks[i].hash;
            blocks[i + 1].parentMined = false;
            blocks[i].good_block = false;
            blocks[i].mine_time = "bad";
        }

        blocks[blocks.length - 1].hash = blocks[blocks.length - 1].generateHash();
        blocks[blocks.length - 1].good_block = false;
        blocks[blocks.length - 1].parentMined = false;
        blocks[blocks.length - 1].mine_time = "bad";
    }

    //checks if blockchain is valid | unused
    this.isChainValid = function (index) {
        if (index == 0) index++;
        for (var i = index; i < blocks.length; i++) {
            if (blocks[i].generateHash() !== blocks[i].hash) {
                blocks[i].good_block = false;
                continue;
            }
            else blocks[i].good_block = true;

            if (blocks[i].parentID !== blocks[i - 1].hash) {
                blocks[i].good_block = false;
                continue;
            }
            else blocks[i].good_block = true;
        }
        return true;
    }
}]);

//service for UI related actions
app.service("UIHelperService", [function () {
    //disables certain elements of the block
    this.disableActions = function (elements) {
        var icon = elements[0],
            btn = elements[1],
            card = elements[2];

        btn.setAttribute("disabled", true);
        card.style.opacity = 0.3;
        icon.classList.remove("fa-search");
        icon.classList.add("fa-spinner");
    }

    //enables certain elements of the block
    this.enableActions = function (elements) {
        var icon = elements[0],
            btn = elements[1],
            card = elements[2];

        btn.removeAttribute("disabled");
        card.style.opacity = 1.0;
        icon.classList.remove("fa-spinner");
        icon.classList.add("fa-search");
    }

    //gets elements from the block
    this.getElements = function (e) {
        var element = e.target;
        while (element && !element.classList.contains("fa")) {
            element = element.firstElementChild;
        }
        var icon = element;

        while (element && !element.classList.contains("btn")) {
            element = element.parentElement;
        }
        var btn = element;

        while (element && !element.classList.contains("card-body")) {
            element = element.parentElement;
        }
        var card = element;
        return [icon, btn, card];
    }
}]);

//controller for block chain. Acts as view updater
app.controller("BlockChainController", ["$scope", 'BlockChainService', function ($scope, BlockChainService) {
    $scope.config = global_config;
    $scope.blocks = [];         //view makes use of this to update all the blocks
    $scope.options = BlockChainService.getOptions();        //options for language in modal popup
    $scope.select_index = $scope.options[0];        

    angular.element(document).ready(function () {
        
        //settings button handler
        $scope.saveBtnClickHandler = function (e) {
            var elements = [parseInt(document.getElementById("txt_difficulty").value),
                            parseInt(document.getElementById("txt_timeout").value),
                            $scope.select_index.value,
                            document.getElementById("txt_url").value];

            BlockChainService.saveBtnClickHandler(elements);
            $scope.blocks = BlockChainService.getBlocks();
            $scope.config = global_config;
        }

        //create block button handler
        $scope.createBtnClickHandler = function (e) {
            BlockChainService.createBtnClickHandler();
            $scope.blocks = BlockChainService.getBlocks();
        }

        //mine button handler
        $scope.mineBtnClickHandler = function (e, index) {
            var updateBlocks = function () {
                $scope.blocks = BlockChainService.getBlocks();
            }
            BlockChainService.mineBtnClickHandler(e, index, updateBlocks);
        }

        //keyup event handler
        $scope.onKeyUpHandler = function (e, index) {
            BlockChainService.onKeyUpHandler(e, index);
            $scope.blocks = BlockChainService.getBlocks();
        }
    });
}]);
