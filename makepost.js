'use strict';

var seneca = require('seneca')();

seneca.listen(10102); //requests from Hapi REST
//seneca.client(10101); //requests to Directory Services

//discovery
seneca.add({cmd:'config'}, function (msg, response) {
  msg.data.forEach(function (item) {
    if (item.name === 'Directory') {
      seneca.client({host:item.address, port:10101});
    }
  })
  response(null, msg.data);
});

seneca.add({role: "make",cmd: "post"}, function( msg, respond) {

  //create base 'post' entity
  var post = seneca.make$('post');

  //content from front-end currently is a single string containing:
    // 'Title', then '###MAIN###CONTENT###' as a seperator, followed
    // by 'Post Body'
  var content = msg.content.split('###MAIN###CONTENT###');

  post.title = content[0]; //see above 'Title'
  post.content = content[1]; // 'Post Body'

  post.author = msg.author;
  post.userscope = msg.userscope;
  post.userid = msg.userid;
    //console.log('userid NEW: ', post.userid);

  post.when = new Date().getTime();

  seneca.act({role:"save", cmd:"post", msg: post}, function (err, response) {
    if (err) {
      respond(err);
    }

    post.id = response.id;

    var thread = seneca.make$('thread');

    if (msg.thread !== 'new') {
      seneca.act({role:"find",cmd:"thread",id:msg.thread},function(err, result) {
        if (err) {
          respond(err);
        }
        //updating an existing thread to append the post.
        thread = result.thread;
        thread.postids += ',' + post.id;
        thread.lastpostwhen = post.when;

        seneca.act({role:"save", cmd:"thread", msg: thread}, function (err, response) {
          if (err) {
            respond(err);
          }
          respond(null, response);
        });
      });

    } else {
      //making a new thread to contain our new post.
      thread.title = post.title;
      thread.postids = post.id;
      thread.lastpostwhen = post.when;
      thread.author = post.author;
      thread.userid = thread.userid;
      thread.userscope = post.userscope;
      thread.parentid = msg.section;

      seneca.act({role:"save", cmd:"thread", msg: thread}, function (err, response) {
        if (err) {
          respond(err);
        }
        respond(null, response);
      });
    }
  });
});
