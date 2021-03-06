// the next line is very important for using images in JS
/* @pjs preload="../pics/game_over.png"; */
'use strict';

/**
 * The ID of the currently signed-in User. We keep track of this to detect Auth state change events that are just
 * programmatic token refresh but not a User status change.
 */
var gData={};
var gInfo={};
var currentUID=-1;
var gameID=0;   // Unique ID of the current active game (or 0 if none is active)
var newGID=0;
var currentGame=null;
var db = firebase.database();
var auth = firebase.auth();
var gameInfo={}; // list of all gameInfo elements
var gameMsg=null;
var debugLevel=2;
var hints=false;
var direction=$('body').attr('dir');
var lang=$('html').attr('lang');
var roleColors={
  'White':'#ffffff',
  'Brown':'#9b4e0f',
  'Black':'#000000'
}

function debug(level, msg) {
  switch (level) {
    case 0: console.error(msg);
      console.trace();
      break;
    case 1: console.warn(msg);
      break;
    case 5: addLine(0,msg);
      break;
    default: if (level<=debugLevel) console.log(msg);
  }
}

// Bindings on load.
window.addEventListener('load', function() {
  debug(2,"loading now");
  $("#signInEmail").parent().get(0).MaterialTextfield.checkDirty();
  $("#signInPass").parent().get(0).MaterialTextfield.checkDirty();
//  var sizeSquare=Math.floor(Math.min(window.innerWidth/10,window.innerHeight/12));
//  $(".game-content").css("width",sizeSquare*10);
//  $(".game-content").css("height",sizeSquare*12);
  $(".newsItem").remove();
//  $("#NewsBlock").empty();

  // From Sign-in switch to Forgot password
  $('#forgotPasswordLink').click( function() {
    $("#forgotEmail").val($("#signInEmail").val());
    $("#forgotEmail").parent().get(0).MaterialTextfield.checkDirty();
    $("#signInModal").hide();
    $("#forgotModal").show();
  });

  // From Sign-in switch to Sign-up
  $('#signUpLink').click( function() {
    $("#signUpEmail").val($("#signInEmail").val());
    $("#signUpEmail").parent().get(0).MaterialTextfield.checkDirty();
    $("#signUpPass").val($("#signInPass").val());
    $("#signUpPass").parent().get(0).MaterialTextfield.checkDirty();
    $("#signUpModal").show();
    $("#signInModal").hide();
  });

  // From Sign-up switch to Sign-in
  $('#signInLink').click( function() {
    $("#signInEmail").val($("#signUpEmail").val());
    $("#signInEmail").parent().get(0).MaterialTextfield.checkDirty();
    $("#signInPass").val($("#signUpPass").val());
    $("#signInPass").parent().get(0).MaterialTextfield.checkDirty();
    $("#signInModal").show();
    $("#signUpModal").hide();
  });

/*------------------------------------------------------------------------------
// Email Sign-in
------------------------------------------------------------------------------*/
  $('#signInEmailButton').click( function() {
    if ($("#signInEmail").val().length < 1) {
      $("#loginMsg").html("Please enter a valid email");
      return;
    }
    if ($("#signInPass").val().length < 1) {
      $("#loginMsg").html('Please enter a password.');
      return;
    }
    auth.signInWithEmailAndPassword($("#signInEmail").val(), $("#signInPass").val())
      .then(function() {
        var user=auth.currentUser;
        if (!user) {
          debug(0,'Error: Login success and no user?');
          return;
        }
/* email verification - currently disabled
        if (!user.emailVerified) {
          auth.signOut();
          loginMsg.innerHTML='Please check your email, and verify the account';
          return;
        }
*/
      })
      .catch(function(error) {
          var errorCode = error.code;
          var errorMessage = error.message;
          if (errorCode === 'auth/wrong-password') {
            $("#loginMsg").html('Wrong password.');
          } else {
            $("#loginMsg").html(errorMessage);
          }
          debug(0,error);
      });
  });

/*------------------------------------------------------------------------------
// Send reset email
------------------------------------------------------------------------------*/
  $('#sendEmailButton').click( function() {
    auth.sendPasswordResetEmail($("#forgotEmail").val())
      .then(function() {
        $("#signInEmail").val($("#forgotEmail").val());
        $("#signInEmail").parent().get(0).MaterialTextfield.checkDirty();
        $("#loginMsg").html('Reset password was sent. Check you email');
        $("#forgotModal").hide();
        $("#signInModal").show();
      })
      .catch(function(error) {
          var errorCode = error.code;
          var errorMessage = error.message;
          $("#forgotMsg").html(errorMessage);
          debug(0,error);
      });
  });

  $('#cancelForgetButton').click( function() {
    $("#forgotModal").hide();
    $("#signInModal").show();
  });


/*------------------------------------------------------------------------------
// Create new user
------------------------------------------------------------------------------*/
  $('#createUserButton').click( function() {
    if ($("#displayName").val().length < 1) {
      $("#signUpMsg").html("Please enter your display name");
      return;
    }
    if ($("#signUpEmail").val().length < 1) {
      $("#signUpMsg").html("Please enter a valid email");
      return;
    }
    if ($("#signUpPass").val().length < 1) {
      $("#signUpMsg").html('Please enter a password.');
      return;
    }
    if ($("#signUpPass").val() != $("#signUpPass2").val()) {
      $("#signUpMsg").html('Passwords does not match.');
      return;
    }
    auth.createUserWithEmailAndPassword($("#signUpEmail").val(), $("#signUpPass").val())
      .then(function () {
        auth.currentUser.updateProfile({
          displayName: $("#displayName").val(),
          photoURL: "../pics/silhouette.png"
        }).then(function() {
/* email verification - currently disabled
          auth.currentUser.sendEmailVerification();
          auth.signOut();
          loginMsg.innerHTML='Please check your email, and verify the account';
*/
          $("#welcomeMsg").html(auth.currentUser.displayName);
          $("#welcomePic").attr('src',auth.currentUser.photoURL);
          $("#signInModal").show();
          $("#signUpModal").hide();
        });
      })
      .catch(function(error) {
        var errorCode = error.code;
        var errorMessage = error.message;
        $("#signUpMsg").html(errorMessage);
      });
  });

/*------------------------------------------------------------------------------
// Google Sign-in
------------------------------------------------------------------------------*/
  $('#signInGoogleButton').click( function() {
    var provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
      .then(function() {
        var user=auth.currentUser;
        if (!user) {
          debug(0,'Error: Google login success and no user?');
          return;
        }
      })
  });

/*------------------------------------------------------------------------------
// Facebook Sign-in
------------------------------------------------------------------------------*/
  $('#signInFacebookButton').click( function() {
    var provider = new firebase.auth.FacebookAuthProvider();
    auth.signInWithPopup(provider)
      .then(function() {
        var user=auth.currentUser;
        if (!user) {
          debug(0,'Error: Facebook login success and no user?');
          return;
        }
      })
  });

/*------------------------------------------------------------------------------
// Guest Sign-in
------------------------------------------------------------------------------*/
  $('#signInGuestButton').click( function() {
    auth.signInAnonymously()
      .then(function() {
        var user=auth.currentUser;
        if (!user) {
          debug(0,'Error: Guest login success and no user?');
          return;
        }
      })
      .catch(function(error) {
        var errorCode = error.code;
        var errorMessage = error.message;
        alert(errorMessage);
        debug(0,error);
      });
  });

/*------------------------------------------------------------------------------
// Sign-out
------------------------------------------------------------------------------*/
  $('#signOutButton').click( function() {
    var user=auth.currentUser;
    if (!user) {
      debug(0,'Error: trying to logout and no user?');
      return;
    }
    if (user.isAnonymous)
      user.delete();
    else
      auth.signOut();
  });

  // Listen for auth state changes
  auth.onAuthStateChanged(onAuthStateChanged);

}, false);


//*************************************************************************************************
//   User selected to exit the current game
//*************************************************************************************************
function closeActiveWindow() {
  if (gameID >0) {
    $(".gameBoard").hide();
    $("#sjButtons").hide();
    if (gInfo=={}) {
      debug(0, "gInfo is empty");
      return;
    }
    newGID= 0;
    gameMsg=gInfo.game
    debug(2,"Stopped playing "+gameMsg);  
    gInfo={};
    gData={};
  }
}

// When the user clicks anywhere outside of the modal, close it

window.onclick = function(event) {
  if (event.target == forgotModal) {
      $("#forgotModal").hide();
      $("#signInModal").show();
  }
  if (event.target.classList.contains('gameBoard')) closeActiveWindow();
  if (event.target.classList.contains('allowClose')) {
    event.target.style="display:none";
  }
}

// when user clicks the X button inside a game

$(".gameButtonClose").click(closeActiveWindow);

//*************************************************************************************************
//   User selected to quit (resign) the game
//*************************************************************************************************
$(".gameButtonEnd").click( function() {
  swal({
    title: "Are you sure?",
    text: "You will forfeit the "+((gData.playTo==1)?"game":"entire match"),
    icon: "warning",
    dangerMode: true,
    buttons: {
      cancel: {
        visible: true,
        text: "No, keep playing",
        value: false,
        closeModal: true,
      },
      confirm: {
        text: "Yes, I quit!",
        value: "endAll",
        closeModal: true,
      },
    }
  })
  .then(function(value){
    switch (value) {
    case "endAll":
      gInfo.status="quit";
      gInfo.overMsg=auth.currentUser.displayName+" had quit the game";
      db.ref("gameInfo/"+gameID).set(gInfo);
      break;
   
    default:
      swal({
        title: "Cancelled", 
        text: "Keep Playing", 
        icon: "error",
        buttons: false,
        timer: 1000
      });
    }
  })
});



//*************************************************************************************************
//   User selected to join the game as a player
//*************************************************************************************************
function gameButtonJoin() {
  if (gInfo.status=="pending") {
    if (currentGame == "chess" && this.value == "White") {
      gInfo.playerList.splice(0,0,{  // if new player is White, push as first player
        role:this.value,
        uid:currentUID,
        displayName:auth.currentUser.displayName,
        photoURL:auth.currentUser.photoURL});
    }
    else { 
      gInfo.playerList.push({
        role:this.value,
        uid:currentUID,
        displayName:auth.currentUser.displayName,
        photoURL:auth.currentUser.photoURL});
    }
    switch (currentGame) {
      case "chess":
      case "backgammon":
        gInfo.status="active"; // two-player game. Start automatically when the 2nd player joins
        gData.toggle=gData.toggle^1; // just touch gData to force update to everyone.
        break;
      case "uno":
		gData.playerDeck.push({cards:[]});
        gData.unoProtected.push(false);
        gData.roundCards.push(7); // start with 7 cards
        for (var i=0; i<7; i++) {
          gData.playerDeck[gData.nPlayers].cards.push(gData.closedDeck.pop());
        }
        gData.nPlayers++;
        if (gData.nPlayers==$("#unoMaxPlayers").val())
          gInfo.status="active";
        break;
    }
    db.ref("gameInfo/"+gameID).set(gInfo);
    db.ref("gameData/"+gInfo.game+"/"+gameID).set(gData);
  }
  else debug(0,"Game not Pending. Can't start");
}

// When user clicks the JOIN button
$("#gameButtonJoin").click(gameButtonJoin);

//*************************************************************************************************
//   User selected to start the game without the maximum players
//*************************************************************************************************
$("#gameButtonStart").click(function() {
  gInfo.status="active";
  gData.toggle=gData.toggle^1; // just touch gData to force update to everyone.
  db.ref("gameInfo/"+gameID).set(gInfo);
  db.ref("gameData/"+gInfo.game+"/"+gameID).set(gData);
});



/*------------------------------------------------------------------------------
// Firebase Auth changed: either login or logout
------------------------------------------------------------------------------*/
function onAuthStateChanged(user) {
  // We ignore token refresh events.
  if (user && currentUID === user.uid) {
    debug(1,"Auth: No change");
    return;
  }
  if (!user) {
    debug(1,"Auth: Logout event");
    $(".gameLists").empty();   // clear all the lists
    $("#userMenu").hide();
    $(".WelcomeGuest").hide();
    $(".WelcomeNewUser").hide();
    $(".WelcomeNews").hide();
    $("#splashPage").show();
    $(".gameButtons").attr("disabled",true);
    hints=false;
    currentUID=-1;
    return;
  }
  debug(1,"Auth: Login "+user.displayName);

  var displayName=user.displayName;
  var photoURL=user.photoURL;
  currentUID=user.uid;
  $("#splashPage").hide();
  if (user.isAnonymous) {
    displayName="Guest";
    photoURL="../pics/silhouette.png";
    $("#editProfileButton").attr("disabled",true);
    user.updateProfile({
      displayName: displayName,
      photoURL: photoURL,
    });
    $(".WelcomeGuest").show();
    $(".WelcomeNewUser").show();
    hints=true;
  }
  else {
    $(".WelcomeGuest").hide();
    $("#editProfileButton").attr("disabled",false);
    db.ref('users/' + currentUID).once("value", function(snapshot) {
      if (!snapshot.val() || !snapshot.val().saw_tutorial) {
        $(".WelcomeNewUser").show();
        hints=true;
        snapshot.ref.set({
          username: displayName,
          profile_picture : photoURL,
          saw_tutorial:true
        })
      }
      else
        $(".WelcomeNewUser").hide();
        hints=false;
    });
    db.ref('users/' + currentUID).update({
      username: displayName,
      profile_picture : photoURL,
    });
  }
  $("#welcomeMsg").html(displayName);
  $("#welcomePic").attr('src',photoURL);
  $("#userMenu").show();

  var gameInfoRef = db.ref("gameInfo");

  gameInfoRef.on("child_added", function(snapshot) {
    debug(1,"child_added");
    addGameToList(snapshot.val());
  });

  gameInfoRef.on("child_changed", function(snapshot) {
    debug(1,"child_changed");
    var gInfo=snapshot.val();
    removeFromList(gInfo);
    var clean=true;
    for (var p in gInfo.playerList) {
     if (gInfo.playerList[p].uid!=0) clean=false;   // is there an active player (with valid uid) ?
    }
    if (clean) {                  // if there are no more valid players (Everybody left) than remove the game.
      debug(2,"clean "+gInfo.game+"/"+gInfo.gid);
      var up=new Object();
      up["/gameData/"+gInfo.game+"/"+gInfo.gid]={};
      up["/gameInfo/"+gInfo.gid]={};
//    up["/gameChat/"+gInfo.game+"/"+gInfo.gid]={};
      return db.ref().update(up);
    }
    else {
      addGameToList(gInfo);
    }
  });

  gameInfoRef.on("child_removed", function(snapshot) {
    debug(1,"child_removed");
    removeFromList(snapshot.val());
  });
}

/*------------------------------------------------------------------------------
// Update list of games whenever gameInfo entry is added/removed/changed

<div id="<game><listType>List" class="Active gameLists" >  -- listName
  <button class="mdl-list__item mdl-list__item--two-line"> -- node
    <span class="mdl-list__item-primary-content">          -- sp
    <span>  </span>                                      -- pnode 1
    <span "mdl-list__item-sub-title">  </span>           -- pnode 2
    </span>
  <img>                                                  -- pic
  </button>
</div>
------------------------------------------------------------------------------*/

function addGameToList(gInfo) {
  debug(2,"addGameToList");
  var active=false; // Does this user participate in the added game?
  gameInfo[gInfo.gid]=gInfo;
  var node=$("<button id='line-"+gInfo.game+"-"+gInfo.gid+"' value='"+gInfo.gid+"' style='width:300px; margin: auto' class='mdl-list__item '></button>");
  var justMe=true;
  var partner="yourself";
  for  (var p in gInfo.playerList) {
    var thisPlayer=gInfo.playerList[p];
    var element= $("<div><img  style='border-radius: 50%;padding:5px;width:40px;height:40px' src='"+thisPlayer.photoURL+"'></div>");
//    element.css({'background':roleColors[thisPlayer.role], 'border':"medium "+((thisPlayer.uid==gInfo.playerList[gInfo.currentPlayer].uid)?"solid":"none")+" red",'margin': 'auto' });
    element.css({'background':roleColors[thisPlayer.role], 'border':"medium "+((gInfo.currentPlayer==p)?"solid":"none")+" red",'margin': 'auto' });
    element.prop('title', thisPlayer.displayName);
    node.append(element);
    if (thisPlayer.uid==currentUID) {
      active=true;
    }
    else {
      if (justMe) {
        justMe=false;
        partner=thisPlayer.displayName;
      }
    }
  }
  if (gInfo.status=="quit")
  {
    if (active) {
      swal({
        title: gInfo.overMsg,
        text: "  ",
        buttons: false,
        icon: "../pics/game_over.png",
//        timer: 2000,
      })
      .then(function(value){
        if (gameID==gInfo.gid) closeActiveWindow();
      });      
      var updates=new Object();
      for (var p in gInfo.playerList)
        if (gInfo.playerList[p].uid==currentUID)
          updates[p+'/uid']=0;
      db.ref("gameInfo/"+gInfo.gid+"/playerList/").update(updates);
      addLine(gInfo,gInfo.game+":"+gInfo.overMsg);
    }
  }
  else if (gInfo.status=="pending") {
    addToList(gInfo.game,"Pending",node);
    if (!partner) partner="yourself";
    addLine(gInfo,"You can join a new "+gInfo.game+" game with "+partner);
  }
  else if (gInfo.playerList[gInfo.currentPlayer].uid==currentUID)  {
    addToList(gInfo.game,"Active",node);
    addLine(gInfo,"It's now your turn to play "+gInfo.game+" with "+partner);
  }
  else if (active) {
    addToList(gInfo.game,"Wait",node);
    addLine(gInfo,"Waiting for "+partner+" to make "+gInfo.game+" move.");
  }
  else
    addToList(gInfo.game,"Watch",node);

// This is the callback function to enter the selected game when the button was pressed
  $("#"+node.attr('id')).click( function() {
    debug(2,"Game selected:"+this.id);
    this.parentElement.parentElement.style="display:none";
//    $(".mdl-spinner").addClass("is-active");
    newGID=this.value;
    gameMsg=gInfo.game;
  });
}

function addLine(gInfo, msg) {
  if ($("#li"+gInfo.gid).length) {
    $("#li"+gInfo.gid).html(msg);
  }
  else if (gInfo){
    $("#NewsBlock").append("<li class='newsItem' id='li"+gInfo.gid+"'>"+msg+"</li>");
  }
  else {
    $("#NewsBlock").append("<li class='newsItem'>"+msg+"</li>");
  }
  $(".WelcomeNews").show();
}

function addToList(game,list,node) {
    debug(2,"Add "+node.val()+" to "+game+" "+list);
    debug(3,gameInfo);
    var listName="."+game+"Class ."+list+" .gameLists";
    $(listName).append(node);
    if (list=="Active") {
      var nActive=$(listName).children().length;
      if (nActive==1) $("#"+game+"Badge").addClass("mdl-badge");
      $("#"+game+"Badge").attr("data-badge",nActive);
    }
    $("#"+game+list+"ListButton").attr("disabled", false);
}

function removeFromList(gInfo) {
    debug(2,"Remove from list");
    delete gameInfo[gInfo.gid];
    var node=$("#line-"+gInfo.game+"-"+gInfo.gid);
    if (node[0] === undefined) return;
    var pnode=node.parent();
    node.remove();
    if (pnode.parent().hasClass("Active")) {
      var nActive=pnode.children().length;
      if (nActive==0) $("#"+gInfo.game+"Badge").removeClass("mdl-badge");
      else $("#"+gInfo.game+"Badge").attr("data-badge",nActive);
    }
    if (pnode.children().length<1)       // No more items in the list
      $("#"+gInfo.game+pnode.attr("value")+"ListButton").attr("disabled",true);
}


// -----------------------------------  Edit Profile --------------------------------------------------------------------------------------


$("#editProfileButton").click( function() {
  if(!this.hasAttribute("disabled")) {
    $("#updatePic").attr('src',auth.currentUser.photoURL);
    $("#displayNameUpdate").val(auth.currentUser.displayName);
    $("#displayNameUpdate").parent().get(0).MaterialTextfield.checkDirty();
    $("#editProfileModal").show();
  }
});

$("#profileSend").click( function() {
  if ($("#displayNameUpdate").val() != auth.currentUser.displayName) {
    auth.currentUser.updateProfile({
      displayName: $("#displayNameUpdate").val(),
    }).then(function(snapshot){
      $("#welcomeMsg").html(auth.currentUser.displayName);
      db.ref('users/' + currentUID).update({   // also update in database
        displayName : auth.currentUser.displayName,
      });
    });
  }
  if ($("#uploadBtn").val()) {
    var fileRef = firebase.storage().ref().child("img/"+currentUID+".jpg");
    fileRef.put($("#uploadBtn")[0].files[0]).then(function(snapshot) {
      auth.currentUser.updateProfile({
        photoURL: snapshot.downloadURL
      }).then(function(snapshot){
          $("#welcomePic").attr('src',auth.currentUser.photoURL);
          db.ref('users/' + currentUID).update({   // also update in database
            profile_picture : auth.currentUser.photoURL,
          });
        });
    });
  }
  $("#editProfileModal").hide();
});

$("#profileCancel").click( function() {
  $("#editProfileModal").hide();
});


$("#uploadBtn").change(function () {
  var img=document.getElementById("updatePic");
  var newPic=this.files[0];
    $("#uploadFile").html(newPic.name);
    var reader = new FileReader();
    reader.onload = function(){
      img.src = reader.result;
    };
    reader.readAsDataURL(newPic);
});

// -----------------------------------  Game buttons --------------------------------------------------------------------------------------

$(".gameButtons").click( function() {
  if(!this.hasAttribute("disabled")) {
    $("."+this.getAttribute("game")+"Class "+".modal."+this.getAttribute("catag")).show();
//    $("#"+this.getAttribute("game")+this.getAttribute("catag")+"Modal").show();
  }
});


$(".NewGame").click( function() {
  if (auth.currentUser.isAnonymous)
    swal("Not Allowed","Guest player can't start a new game. Please sign up for free.","error");
});

$(".gameMainButton").click( function() {
  $(".WelcomeNewUser").hide();
  $(".WelcomeNews").hide();
  $(".newsItem").remove();
  hints=false;
});

$("#helpButton").click( function() {
  if (hints) {
    $(".WelcomeNewUser").hide();
    hints=false;
  } 
  else {
    $(".WelcomeNewUser").show();
    hints=true;
  }
});

// ---------------------------------------- Global Functions -------------------------------------------------------------------------------------
/*-------------------------------------------------------------------------------------------------
This function shuffles the top "count" cards in the "deck"
 This is done by selecting pair of cards and switching thier order, repeated 200 times
-------------------------------------------------------------------------------------------------*/
function shuffleCards(deck, count) {
  var a,b,c;
  for(var i = 0;i<200;i++) {
    a=Math.floor(Math.random() * count);
    b=Math.floor(Math.random() * count);
    c=deck[a];
    deck[a]=deck[b];
    deck[b]=c;
  }
}

