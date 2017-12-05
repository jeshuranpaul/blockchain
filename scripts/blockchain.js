global_config = {
    difficulty: 3,
    timeout: 100000,
    langugage: 1
}


function Block() {
    this.id = "";
    this.nonce = 0;
    this.data = "";
    this.mine_time = null;
    this.mine_action_perf = false;
    this.good_block = false;
    this.parentID = 0;
    this.parentMined = false;
    this.hash = null;
}

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



//angular code -> controls the blockchain
var app = angular.module('BlockChain', []);

app.controller("blockchain_controller", ["$scope", '$http', '$timeout', function ($scope, $http, $timeout) {
    $scope.config = global_config;

    angular.element(document).ready(function () {
        $scope.blocks = [];
        $scope.saveBtnClickHandler = function (e) {
            var diff = parseInt(document.getElementById("txt_difficulty").value),
            	curr_diff = global_config.difficulty,
                timeout = parseInt(document.getElementById("txt_timeout").value),
                lang = document.getElementById("select_language"),
                lang_val = parseInt(lang.options[lang.selectedIndex].value);

            global_config.difficulty = !isNaN(diff) ? diff : global_config.difficulty;
            global_config.timeout = !isNaN(timeout) ? timeout : global_config.timeout;
            global_config.langugage = !isNaN(lang_val) ? lang_val : global_config.langugage;

            $scope.config = global_config;
            if (curr_diff != global_config.difficulty)
                $scope.resetAllBlocks();
        }

        $scope.resetAllBlocks = function () {
            for (var i = 0; i < $scope.blocks.length; i++) {
                $scope.blocks[i].nonce = 0;
                $scope.blocks[i].mine_time = null;
                $scope.blocks[i].mine_action_perf = false;
                $scope.blocks[i].good_block = false;
                $scope.blocks[i].hash = $scope.blocks[i].generateHash();
                $scope.blocks[i].parentMined = false;

                if (i != $scope.blocks.length - 1)
                    $scope.blocks[i + 1].parentID = $scope.blocks[i].hash;
            }
        }

        $scope.createBtnClickHandler = function (e) {
            var new_block = new Block();
            new_block.createBlock();
            if ($scope.blocks.length == 0) {
                $scope.blocks.push(new_block);
                return;
            }

            new_block.parentID = $scope.blocks[$scope.blocks.length - 1].hash;
            new_block.parentMined = $scope.blocks[$scope.blocks.length - 1].mine_action_perf && $scope.blocks[$scope.blocks.length - 1].good_block;
            $scope.blocks.push(new_block);
        }

        $scope.mineBtnClickHandler = function (e, index) {
            debugger;
            if (index > 0 && !$scope.blocks[index].parentMined) return;

            var disableActions = function (btn, card, icon) {
                btn.setAttribute("disabled", true);
                card.style.opacity = 0.3;
                icon.classList.remove("fa-search");
                icon.classList.add("fa-spinner");
            }

            var enableActions = function (btn, card, icon) {
                btn.removeAttribute("disabled");
                card.style.opacity = 1.0;
                icon.classList.remove("fa-spinner");
                icon.classList.add("fa-search");
            }

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

            disableActions(btn, card, icon);

            if (global_config.langugage == 1) {
                $timeout(function () {
                    debugger;
                    $scope.blocks[index].mine(global_config.difficulty);
                    if (index < $scope.blocks.length - 1) {
                        $scope.blocks[index + 1].parentID = $scope.blocks[index].hash;
                        if ($scope.blocks[index].good_block)
                            $scope.blocks[index + 1].parentMined = true;
                    }
                    enableActions(btn, card, icon);
                }, 0);
            }
            else if (global_config.langugage == 2) {
                var data_json = {
                    block: $scope.blocks[index].id,
                    parent: $scope.blocks[index].parentID,
                    data: $scope.blocks[index].data,
                    hash: $scope.blocks[index].hash,
                    nonce: $scope.blocks[index].nonce,
                    difficulty: global_config.difficulty,
                    timeout: global_config.timeout
                };

                var successCallback = function (response) {
                    $scope.blocks[index].mine_action_perf = true;
                    if (response.data["status"]) {
                        $scope.blocks[index].good_block = true;
                        $scope.blocks[index].mine_time = response.data["time"] + " ms";
                        $scope.blocks[index].hash = response.data["hash"];
                        $scope.blocks[index].nonce = response.data["nonce"];
                        $scope.blocks[index + 1].parentMined = true;
                    }
                    else {
                        $scope.blocks[index].good_block = false;
                        $scope.blocks[index].mine_time = "Timeout. Mine for more time";
                        $scope.blocks[index + 1].parentMined = false;
                    }

                    if (index < $scope.blocks.length - 1) {
                        $scope.blocks[index + 1].parentID = $scope.blocks[index].hash;
                    }
                    enableActions(btn, card, icon);
                }
                var errorCallback = function (response) {
                    $scope.blocks[index].good_block = false;
                    $scope.blocks[index].mine_action_perf = true;
                    $scope.blocks[index].mine_time = "Error connecting to server";
                    $scope.blocks[index + 1].parentMined = false;
                    enableActions(btn, card, icon);
                }

                $http({
                    method: 'POST',
                    url: 'http://localhost:8080/Blockchain/MineBlockServlet',
                    contentType: 'application/json',
                    data: JSON.stringify(data_json)
                }).then(successCallback, errorCallback);
            }
        }

        $scope.onKeyUp = function (e, index) {
            $scope.blocks[index].data = e.target.value;
            $scope.propogateChange(index);
            $scope.blocks[index].good_block = false;
        }

        $scope.propogateChange = function (index) {
            debugger;
            for (var i = index; i < $scope.blocks.length - 1; i++) {
                $scope.blocks[i].hash = $scope.blocks[i].generateHash();
                $scope.blocks[i + 1].parentID = $scope.blocks[i].hash;
                $scope.blocks[i + 1].parentMined = false;
                $scope.blocks[i].good_block = false;
            }

            $scope.blocks[$scope.blocks.length - 1].hash = $scope.blocks[$scope.blocks.length - 1].generateHash();
            $scope.blocks[$scope.blocks.length - 1].good_block = false;
            $scope.blocks[$scope.blocks.length - 1].parentMined = false;
        }

        $scope.isChainValid = function (index) {
            if (index == 0) index++;
            for (var i = index; i < $scope.blocks.length; i++) {
                if ($scope.blocks[i].generateHash() !== $scope.blocks[i].hash) {
                    $scope.blocks[i].good_block = false;
                    continue;
                }
                else $scope.blocks[i].good_block = true;

                if ($scope.blocks[i].parentID !== $scope.blocks[i - 1].hash) {
                    $scope.blocks[i].good_block = false;
                    continue;
                }
                else $scope.blocks[i].good_block = true;
            }
            return true;
        }
    });
}]);
