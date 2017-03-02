var tempId = prompt("Please enter your ID (this is your username), leaving this blank will generate an ID", "");
// Showing off some of the configs available with PeerJS :).

var peer = new Peer(tempId, {
    // Set API key for cloud server (you don't need this if you're running your own.
    key: 'byavgkbbr00pmn29',
    debug: 3,

    // Set a logging function:
    logFunction: function () {
        $('.log').append(Array.prototype.slice.call(arguments).join(' ') + '<br>');
    }
});
var connectedPeers = {};

// Show this peer's ID.
peer.on('open', function (id) {
    $('#pid').text(id);
});

// Await connections from others
peer.on('connection', connect);
peer.on('error', function (err) {
    console.log(err);
})

// Handle a connection object.
function connect(c) {
    // Handle a chat connection.
    if (c.label === 'chat') {
        var chatbox = $('<div></div>').addClass('connection').addClass('active').attr('id', c.peer);
        var header = $('<h1></h1>').html('Chat with <strong>' + c.peer + '</strong>');
        var messages = $('<div><em>Peer connected.</em></div>').addClass('messages');
        chatbox.append(header);
        chatbox.append(messages);
        chatbox.on('click', function () {
            if ($(this).hasClass('active')) {
                $(this).removeClass('active');
            } else {
                $(this).addClass('active');
            }
        });
        $('.filler').hide();
        chatbox.hide();
        $('#connections').append(chatbox);
        chatbox.slideDown(500);

        c.on('data', function (data) {
            messages.append('<div><span class="peer">Peer</span>: ' + data + '</div>');
        });
        c.on('close', function () {
            alert(c.peer + ' has left the chat.');
            chatbox.remove();
            if ($('.connection').length === 0) {
                $('.filler').show();
            }
            delete connectedPeers[c.peer];
        });
    } else if (c.label === 'file') {
        c.on('data', function (data) {
            // If we're getting a file, create a URL for it.
            console.log(data);
            if (data.constructor === ArrayBuffer) {
                var url = window.URL.createObjectURL(new Blob([new Uint8Array(data)]));
                $('#' + c.peer).find('.messages').append('<div><span class="file">' +
                    'Peer has sent you a file. <a target="_blank" href="' + url + '">View</a>. <a download href="' + url + '">Download</a>.</span></div>');
            }
        });
    }
    connectedPeers[c.peer] = 1;
}

$(document).ready(function () {
    // Prepare file drop box.
    var box = $('#box');
    box.on('dragenter', doNothing);
    box.on('dragover', doNothing);
    box.on('drop', function (e) {
        e.originalEvent.preventDefault();
        var file = e.originalEvent.dataTransfer.files[0];
        eachActiveConnection(function (c, $c) {
            if (c.label === 'file') {
                c.send(file);
                $c.find('.messages').append('<div><span class="file">You sent a file.</span></div>');
            }
        });
    });

    function doNothing(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Connect to a peer
    $('#connect').click(function () {
        var requestedPeer = $('#rid').val();
        if (!connectedPeers[requestedPeer]) {
            // Create 2 connections, one labelled chat and another labelled file.
            var c = peer.connect(requestedPeer, {
                label: 'chat',
                serialization: 'none'
            });
            c.on('open', function () {
                connect(c);
            });
            c.on('error', function (err) {
                alert(err);
            });
            var f = peer.connect(requestedPeer, {
                label: 'file',
                reliable: true
            });
            f.on('open', function () {
                connect(f);
            });
            f.on('error', function (err) {
                alert(err);
            });
        }
        connectedPeers[requestedPeer] = 1;
    });

    // Close a connection.
    $('#close').click(function () {
        eachActiveConnection(function (c) {
            c.close();
        });
    });

    // Send a chat message to all active connections.
    $('#send').submit(function (e) {
        e.preventDefault();
        var msg = $('#text').val();
        eachActiveConnection(function (c, $c) {
            if (c.label === 'chat') {
                c.send(msg);
                $c.find('.messages').append('<div><span class="you">You: </span>' + msg + '</div>');
            }
        });
        $('#text').val('');
        $('#text').focus();
    });

    // Goes through each active peer and calls FN on its connections.
    function eachActiveConnection(fn) {
        var actives = $('.active');
        var checkedIds = {};
        if (actives.length!=0) {
        actives.each(function () {
            var peerId = $(this).attr('id');
            if (!checkedIds[peerId]) {
                var conns = peer.connections[peerId];
                for (var i = 0; i < conns.length; i++) {
                    fn(conns[i], $(this));
                }
            }
            checkedIds[peerId] = 1;
        });
        } else {
            alert("There are no selected conections");
        }
    }
});

// Make sure things clean up properly.
window.onunload = window.onbeforeunload = function (e) {
    if (peer && !peer.destroyed) {
        peer.destroy();
    }
};