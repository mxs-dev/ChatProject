"use strict";

var createElementsByHTML = (function(){
    var div = document.createElement("div");
    return function ( html ) {
        var res = [];
        div.innerHTML = html;
        while ( div.firstChild ) {
            res[ res.length ] = div.removeChild( div.firstChild );
        }
        return res;
    };
})();

class DialogHandler {

    constructor () {
        this.dialogBlock = document.getElementById('dialog_block');
        if (this.dialogBlock == undefined) {
            return;
        }

        // activeUser - variable from view.php
        this.isActiveUser = activeUser || 0;

        this.dialogPropertiesLi = document.getElementById('dialog_properties');
        this.sendMessageButton  = document.getElementById('send_message');
        this.messagesList       = document.getElementById('messages_list'); // ul
        this.typingDiv          = document.getElementById('typing');
        this.textArea           = document.getElementById('textarea');
        this.delMessagesButton  = document.getElementById('delete_messages');

        this.dialogId           = this.sendMessageButton.getAttribute('data-dialog_id');
        this.monitored_messages = {my_messages : [], messages : []};
        this.eventListeners     = {};
        this.isLoading          = false;
        this.isTyping           = false;


        this.addEventListeners();
        this.goToTheDialogBottom();
    }

    addEventListeners () {
        let that = this;

        // Event listeners declaration
        this.eventListeners['dialogPropertiesLi'] =  function (e) {
            that.showDialogProperties.apply(that);
        }
        this.eventListeners['sendMessageButton']  =  function (e) {
            that.sendMessage.apply(that);
        }
        this.eventListeners['bodyScroll']         =  function (e) {
            if (e.target.body.scrollTop < 1) {
                that.loadOldMessages.apply(that);
            }
        }
        this.eventListeners['textArea']           =  function (e) {
            that.isTyping = true;
        }
        this.eventListeners['messagesList']       =  function (e) {
            let li = e.target.closest('li');
            if (!li)
                return;
            that.selectMessage.apply(that, [li]);
        }
        this.eventListeners['delMessagesButton']  =  function (e) {
            that.deleteMessages.apply(that);
        }

        //Event listeners adding
        document                .addEventListener('scroll',  this.eventListeners['bodyScroll']);

        if (this.isActiveUser){
            this.dialogPropertiesLi .addEventListener('click',   this.eventListeners['dialogPropertiesLi']);
            this.sendMessageButton  .addEventListener('click',   this.eventListeners['sendMessageButton']);
            this.textArea           .addEventListener('keydown', this.eventListeners['textArea']);
            this.messagesList       .addEventListener('click',   this.eventListeners['messagesList']);
            this.delMessagesButton  .addEventListener('click',   this.eventListeners['delMessagesButton']);
        }

        // intervals
        this.queryInterval = setInterval(function (e) {
            that.tick.apply(that);
        }, 1000);
        this.checkInterval = setInterval(function (e) {
            that.check.apply(that);
        }, 1900);
    }

    sendJsonByAjax (data, success, error, type = "POST") {
        return $.ajax({
            type : type,
            url  : "/chat/ajax",
            success : success,
            error   : error,
            data : data
        });
       /* return new Promise(function (success, error) {
            let xhr = new XMLHttpRequest();
            let formData = new FormData();
            formData.append('json_string', data);
            formData.append('_csrf', $('meta[name="csrf-token"]').attr("content"))
            xhr.open("POST", url, true);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');

            xhr.onload = function () {
                if (xhr.status === 200) {
                    success(xhr.responseText);
                } else {
                    error(xhr.statusText);
                }
            };

            xhr.onerror = function () {
                error(xhr.statusText);
            }

            xhr.send(formData);
        }); */
    }

    createMessage (message, type = 0) {
        let messageDiv = document.createElement('div');
        messageDiv.classList.add('message');

        switch(type){
            case 0 : messageDiv.classList.add('message-incoming');
                break;
            case 1 : messageDiv.classList.add('message-outgoing');
                break;
            case 2 : messageDiv.classList.add('message-error');
                break;
            default : messageDiv.classList.add('message-info');
        }

        messageDiv.innerHTML = message;
        let list_node = document.createElement('li');
        list_node.appendChild(messageDiv);
        return list_node;
    }

    sendMessage () {
        function success (res) {
            try{
                var response = JSON.parse(res);
            } catch (e) {
                console.log(e);
                console.log(res);
                return;
            }

            that.messagesList.removeChild(message);
            that.messagesList.innerHTML += response.message;

            that.textArea.value = '';
            that.goToTheDialogBottom();
            that.goToTheDialogBottom();
        }

        function error (res) {
            message.innerHTML = this.createMessage("Error: '" + res.statusText, 2);
            console.log(res);
        }

        var that = this;
        let text = this.textArea.value;
        if (text == "")
            return;

        var message = this.createMessage('Sending...', 1);
        this.messagesList.appendChild(message);
        this.goToTheDialogBottom();

        let data = JSON.stringify({
            "dialog" : {
                "dialog-id" : this.dialogId,
            },
            "send_message" : {
                "content"   : text
            },
        });

        this.sendJsonByAjax({"json_string" : data}, success, error, "POST");

    }

    tick () {
        function  checkNewMessages (response){
            if (response.new_messages === undefined)
                return;

            if (response.new_messages.length < 1)
                return;

            for (var i in response.new_messages){
                that.messagesList.appendChild( createElementsByHTML(response.new_messages[i])[0] );
            }

            that.goToTheDialogBottom();
        }
        function  handleIsTyping (response){
            if (response.typing.length === 0){
                that.resetIsTyping.apply(that);
                return;
            }

            let typingText = "";
            let separator = (response.typing.length > 1) ? ", " : "";

            for (var i in response.typing){
                typingText += response.typing[i] + separator;
            }

            if (response.typing.length < 2)
                typingText += " is typing now...";
            else
                typingText += " are typing now...";

            if (that.typingDiv.innerHTML != typingText)
                that.typingDiv.innerHTML = typingText;
        }
        function  handleSeenMessages (response) {
            if (response.seen_messages != undefined)
                setMessagesSeen(response.seen_messages);

            if (response.check_is_seen != undefined)
                setMessagesSeen(response.check_is_seen);

            that.resetMonitoredMessages.apply(that);
        }
        function  setMessagesSeen(messages){
            if (messages.length == 0)
                return;

            let need_to_change = [];
            let selector = "";
            for (var i =0; i < messages.length; i++){
                selector += 'li[data-id="'+messages[i]+'"]';
                if (i < messages.length-1)
                    selector += ",";
            }
            need_to_change = that.messagesList.querySelectorAll(selector);
            for (var i = 0; i < need_to_change.length; i++){
                need_to_change[i].dataset.new = "0";
                need_to_change[i].getElementsByTagName('div')[0].classList.remove('message-new');
            }
        }


        function  success (result) {
            try{
                var response = JSON.parse(result);
                // console.log(response);
            } catch (e) {
                console.log(result);
                console.log(e);
                return;
            }

            checkNewMessages(response);
            handleIsTyping(response);
            handleSeenMessages(response);
        }
        function  error   (result) {
            console.log(result.status_text);
        }

        var that = this;
        let messages = this.messagesList.getElementsByClassName('message-incoming');
        let last_m_id = null;

        if (messages.length > 0){
            last_m_id = messages[messages.length - 1].parentNode.getAttribute('data-id');
        } else {
            messages = this.messagesList.getElementsByClassName('message-outgoing');
            if (messages.length > 0){
                last_m_id = messages[messages.length-1].parentNode.getAttribute('data-id');
            } else {
                return;
            }
        }

        let data = JSON.stringify({
            "dialog" : {
                "dialog-id" : this.dialogId
            },
            "load_new_messages" : { // Поиск новых сообщений в диалоге
                "last_message_id" : last_m_id,
            },
            "check_is_typing" : true, // Проверка, кто из пользователей пишет в данный момент.

            "set_is_typing" : {
                "is_typing" : this.isTyping
            },
            "seen_messages" : {  // Отметить сообщения просмотренными.
                "messages" : this.monitored_messages.messages,
            },
            "check_is_seen" : {  // Проверить, не являются ли сообщения просмотренными.
                "check_is_seen" : this.monitored_messages.my_messages,
            }
        });

        this.sendJsonByAjax({"json_string" : data}, success, error, "POST")
        /* .catch(function (e) {
         console.log(e);
         }); */
    }

    check() {
        function scanNewMessages () {
            // возвращает object{my_messages:[...], messages:[...]}
            // my_messages - сообщения текущего пользователя, которые необходимо проверять на измененине is_new другими пользователими
            // messages - сообщения, которые необходимо отправить для обозначения is_new = 0;

            let messages_list = that.messagesList.getElementsByTagName('li');
            let messages_array = [];
            let my_messages_array = [];

            for(var i = 0; i < messages_list.length; i++){
                if ( (messages_list[i].dataset.new === "1") ){

                    if (messages_list[i].getElementsByTagName('div')[0].classList.contains('message-outgoing'))
                        my_messages_array.push(messages_list[i].dataset.id);
                    else
                        messages_array.push(messages_list[i].dataset.id);
                }
            }

            return {
                my_messages : my_messages_array,
                messages : messages_array
            };
        }

        var that = this;
        this.monitored_messages = scanNewMessages();
    }

    loadOldMessages () {
        function success(res) {
            let response = JSON.parse(res);

            if (response.old_messages.length == 0) {
               document.removeEventListener('scroll', that.eventListeners['bodyScroll']);
                that.messagesList.innerHTML = "<h5 class='text-warning text-center'><b>начало диалога</b></h5>" + that.messagesList.innerHTML;
            }

            let scrollBottom = document.body.scrollHeight - document.body.scrollTop;
            for (var i = response.old_messages.length - 1; i >= 0; i--){
                that.messagesList.insertBefore(createElementsByHTML(response.old_messages[i])[0], that.messagesList.firstElementChild);
            }

            document.body.scrollTop = document.body.scrollHeight - scrollBottom;
            that.isLoading = false;
        }
        function error(res) {
            console.log(res);
            that.isLoading = false;
        }

        if (this.isLoading)
            return;

        var that = this;
        let firstMessage = this.messagesList.firstElementChild;
        let firstMessageId = firstMessage.getAttribute('data-id');
        let dialogId = this.sendMessageButton.getAttribute('data-dialog_id');

        let data = JSON.stringify({
            "dialog" : {
                "dialog-id" : this.dialogId
            },
            'load_old_messages': {
                'first_message-id': firstMessageId,
            },
        });

       this.sendJsonByAjax({"json_string" : data}, success, error, "POST")
           /* .catch(function (e) {
                console.log(e);
            }); */
       this.isLoading = true;
    }


    selectMessage (li) {
        if (this.selectedMessages == undefined)
            this.selectedMessages = {};

        let id = li.getAttribute('data-id');
        if (!this.selectedMessages[id]){
            this.selectedMessages[id] = true;
            li.classList.add('message-selected');
        } else
        if (this.selectedMessages[id] == true){
            delete this.selectedMessages[id];
            li.classList.remove('message-selected');
        }


        let div1 = document.getElementById('dialog_header_1');
        let div2 = document.getElementById('dialog_header_2');
        let div3 = document.getElementById('delete_messages');

        if (Object.keys(this.selectedMessages).length > 0){
            div1.style.display = 'none';
            div2.style.display = 'block';
            div3.innerHTML = "<center><a class='btn-sm btn-warning'>" + "Delete " + Object.keys(this.selectedMessages).length + " messages" + "</a></center>";
        } else {
            div3.innerHTML = "";
            div1.style.display = 'block';
            div2.style.display =  'none';
        }


        console.log(this.selectedMessages);
        console.log(Object.keys(this.selectedMessages).length);
    }

    deleteMessages () {
        function success (res) {
            try{
                var response = JSON.parse(res);
            } catch (e) {
                console.log(res);
                console.log(e);
                return;
            }

            if (response.deleted_messages){
                console.log(response.deleted_messages);
            }

            that.selectedMessages = {};

            let selector = "";
            for (var i =0; i < response.deleted_messages.length; i++){
                selector += 'li[data-id="'+response.deleted_messages[i]+'"]';
                if (i < response.deleted_messages.length-1)
                    selector += ",";
            }

            let messages = that.messagesList.querySelectorAll(selector);

            for (var i = 0; i < messages.length; i++){
                that.messagesList.removeChild(messages[i]);
            }

            let div1 = document.getElementById('dialog_header_1');
            let div2 = document.getElementById('dialog_header_2');
            div1.style.display = 'block';
            div2.style.display = 'none';
        }

        function error (res) {

        }

        var that = this;

        if (Object.keys(this.selectedMessages).length > 0) {
            let messages = [];
            for (var i in this.selectedMessages){
                messages.push(i);
            }
            let data = JSON.stringify({
                "dialog" : {
                    "dialog-id" : this.dialogId,
                },
                "delete_messages" : {
                    "messages"   : messages
                },
            });

            this.sendJsonByAjax({"json_string" : data}, success, error, "POST");
        }
    }

    showDialogProperties(){
        function success(res) {
            try{
                var response = JSON.parse(res);
            } catch (e){
                console.log(res);
                console.log(e);
                return;
            }

            $("#chat_modal .modal-body").html(response.form);
            $("#chat_modal").modal();
        }

        function error(res){
            console.log(res);
        }

        var that = this;

        let data = JSON.stringify({
            'dialog' : {
                'dialog-id' : this.dialogId
            },
            'dialog_properties' : true
        });

        this.sendJsonByAjax({"json_string" : data}, success, error, "POST");
    }

    goToTheDialogBottom () {
        let newScrollTop = document.body.scrollHeight - document.body.clientHeight;
        document.body.scrollTop = newScrollTop;
    }

    resetIsTyping () {
        this.isTyping = false;
        this.typingDiv.innerHTML = '';
    }

    resetMonitoredMessages(){
        this.monitored_messages = {my_messages : [], messages : []};
    }
}

var dialog_h = new DialogHandler();
