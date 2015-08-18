'use strict';

var seneca = require('seneca')();

//maybe remove this and add more seneca actions later to keep all the
  //database access in 01_directory-service
seneca.use('jsonfile-store',{folder:'./localdb'})

seneca.listen(10102); //requests from Hapi REST
seneca.client(10101); //requests to Directory Services

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

  //save the post.
  post.save$(function(err,post){
    if (err) {
      respond(err);
    }

    //now we need to update the containing thread.
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
        thread.save$(function (err, response) {
        if (err) {
          respond(err);
        }
        //*******************************************
        //don't forget to go update user postcount ..
        //add later
        console.log('UPDATED Thread:', response);


        respond( null, response );
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
      thread.save$(function(err, thread) {
        if (err) {
          //handleme
        }
        //*******************************************
        //don't forget to go update user postcount ..
        //add later
        console.log('Posted Thread Successfully:', thread);

        respond( null, thread );
      });
    }

  })
});
