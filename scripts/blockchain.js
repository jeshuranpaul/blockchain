global_config = {
    difficulty: 3,
    timeout: 100000
}

function Block() {
    this.id = "";
    this.nonce = 0;
    this.data = "";
    this.mine_time = null;
    this.mine_complete = false;
    this.good_block = false; 
    this.parentID = 0;
    this.hash = null;

    this.createBlock = function () {
        this.id = this.generateUUID();
        this.hash = this.generateHash();
    }

    this.generateHash = function () {
        return sha256(this.id + this.nonce + this.data + this.parentID);
    }

    this.generateUUID = function () {
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/[x]/g, function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        return uuid;
    }

    this.mine = function (difficulty) {
        var start = new Date().getTime(), currtime;
        var str = "";
        for (var i = 0; i < difficulty; i++) str += "0";

        while (this.hash.substr(0, difficulty) !== str) {
            this.nonce++;
            this.hash = this.generateHash();
            currtime = new Date().getTime();
            if (currtime - start > global_config.timeout) {
                this.mine_complete = true;
                this.good_block = false;
                this.mine_time = "timeout";
                return;
            }
        }

        var end = new Date().getTime();
        this.mine_time = (end - start) + " ms";
        this.good_block = true;
        this.mine_complete = true;
    }

    
}

var app = angular.module('BlockChain', []);

app.controller("blockchain_controller", ["$scope", function ($scope) {
    angular.element(document).ready(function () {
        $scope.blocks = [];
        $scope.config = global_config;

        $scope.saveBtnClickHandler = function (e) {
            global_config.difficulty = parseInt(document.getElementById("txt_difficulty").value);
            global_config.timeout = parseInt(document.getElementById("txt_timeout").value);
            $scope.config = global_config;
            debugger;
            $scope.resetAllBlocks();
        }

        $scope.resetAllBlocks = function () {
            for (var i = 0; i < $scope.blocks.length; i++) {
                $scope.blocks[i].nonce = 0;
                $scope.blocks[i].mine_time = null;
                $scope.blocks[i].mine_complete = false;
                $scope.blocks[i].good_block = false;
                $scope.blocks[i].hash = $scope.blocks[i].generateHash();

                if (i != $scope.blocks.length - 1)
                    $scope.blocks[i + 1].parentID = $scope.blocks[i].hash;
            }
        }

        $scope.createBtnClickHandler = function (e) {
            debugger;
            var new_block = new Block();
            new_block.createBlock();
            if ($scope.blocks.length == 0) {
                $scope.blocks.push(new_block);
                return;
            }

            new_block.parentID = $scope.blocks[$scope.blocks.length - 1].hash;
            $scope.blocks.push(new_block);
        }

        $scope.mineBtnClickHandler = function (e, index) {
            $scope.blocks[index].mine(global_config.difficulty);
            if (index < $scope.blocks.length - 1) {
                $scope.blocks[index + 1].parentID = $scope.blocks[index].hash;
            }
        }

        $scope.onKeyUp = function (e, index) {
            debugger;
            $scope.blocks[index].data = e.target.value;
            $scope.propogateChange(index);
            $scope.blocks[index].good_block = false;
        }

        $scope.propogateChange = function (index) {
            for (var i = index; i < $scope.blocks.length - 1; i++) {
                $scope.blocks[i].hash = $scope.blocks[i].generateHash();
                $scope.blocks[i + 1].parentID = $scope.blocks[i].hash;
                $scope.blocks[i].good_block = false;
            }
            
            $scope.blocks[$scope.blocks.length - 1].hash = $scope.blocks[$scope.blocks.length - 1].generateHash();
            $scope.blocks[$scope.blocks.length - 1].good_block = false;
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