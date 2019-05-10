"use strict";
var SERVER = {protocol:'http://', port:7777};
var SERVERS = [/*martin-server*/];

var URIs = {
    login:'login',
    upload:'upload',
    update:'update',
    reports:'get_reports',
}


function _done_request(){
    stop_loading();
    
    if(this.status===200){
        if(this.onsucess){
            this.onsucess(this.responseText, this.glue);
        }
    }else{
        if(this.onfailure){
            this.onfailure("reply code: "+this.status);
        }
    }
}

function _request_failed(){
    console.log('server '+this.server+'...failed');

    this.server++;
    
    if(this.server>=SERVERS.length){
        showToast('failed to communicate with all servers. are you online?');
        stop_loading();
        return;
    }
    
    request(this.uri,this.method,this.payload,this.onsucess,this.onfailure,this.server,this.glue, this._onprogress)
}

function request(uri,method,payload=null,onsucess=null,onfailure=null,server=0,glue=null, onprogress=null){
    // glue will be passed on to onsucess along witht the server reply...
    var req = new XMLHttpRequest();
    
    req.open(method,SERVER.protocol+SERVERS[server]+':'+SERVER.port+'/'+uri, true);
    
    req.onsucess = onsucess;
    req.onfailure = onfailure;
    req._onprogress = onprogress;
    req.glue = glue;
    req.server = server;
    req.method    = method
    req.uri    = uri
    req.payload    = payload
    
    req.onload = _done_request;
    req.onerror = _request_failed;
    if(onprogress){req.onprogress = onprogress;}
    
    req.send(payload);
    
    start_loading();
}


function login(){
    // send login credentials ALONG WITH the device serial number to the server to check the login

    let uname = document.getElementById('uname').value;
    let pswd = document.getElementById('pswd').value;

    if(!uname.length || !pswd.length){
        flag_error('please fill in both fields');
        return;
    }

    if(uname.indexOf(':')>=0){
        DEVICE_SERIAL_NUMBER = uname.slice(uname.indexOf(':')+1, uname.length);
        uname = uname.slice(0,uname.indexOf(':'));

        if(SERVERS.indexOf('0.0.0.0')<0){
            SERVERS.splice(0,0,'0.0.0.0'); // we are in development mode, server is on PC
        }
    }

    let form = new FormData();
    form.append('uname',uname);
    form.append('pswd',pswd);
    form.append('device',DEVICE_SERIAL_NUMBER);

    request(URIs.login,'post',form,
        function(reply){
            reply = JSON.parse(reply);

            if(!reply.status){
                flag_error(reply.log);
                return;
            }

            AGENT.uname = reply.uname;
            AGENT.names = reply.names;
            SESSION_ID = reply.session_id;

            document.getElementById('login_div').style.display = 'none';
            
            // do these when login is successfull
            document.getElementById('meter_details').style.display = 'block';
            //get_location();
            
            document.getElementById('pswd').value = '';

            if(!GPSon()){
                showToast('please turn on your GPS(location), you wont submit the report if GPS off');
            }
            
            document.getElementById('watermark').style.display = 'inline-block';

        },
        flag_error
    );

}


function showToast(msg,duration='long',position='bottom'){
    try{
        window.plugins.toast.show(msg,duration,position);
    }catch(e){
        // probably in browser where we dont have the toast plugin...
        flag_error(msg);
    }
}

function show_main_div(){
    document.getElementById('login_div').style.display = 'none';
    document.getElementById('report_crime_div').style.display = 'block';
}

function exit_search(){
    document.getElementById('search_div').style.display = 'none';
    document.getElementById('report_crime_div').style.display = 'block';
}

function view_search(){
    document.getElementById('report_crime_div').style.display = 'none';
    document.getElementById('search_div').style.display = 'block';
}

function exit_full_report(){
    document.getElementById('full_report_div').style.display = 'none';
    document.getElementById('search_div').style.display = 'block';
}

function load_full_report(){

    document.getElementById('profile_pic').src = this.getElementsByTagName('img')[0].src;
    
    let spans = this.getElementsByClassName('value');
    
    document.getElementById('ref_no').innerHTML = spans[0].innerHTML;
    document.getElementById('crime').innerHTML = spans[1].innerHTML;
    document.getElementById('inames').innerHTML = spans[2].innerHTML;
    
    document.getElementById('search_div').style.display = 'none';
    document.getElementById('full_report_div').style.display = 'block';
}

function readURL(input) {

  if (input.files && input.files[0]) {
    var reader = new FileReader();

    let img = document.createElement('img');
    img.setAttribute('class','img-attachment');

    reader.onload = function(e) {
      img.setAttribute('src', e.target.result);
    }

    reader.readAsDataURL(input.files[0]);

    document.getElementById('rattachments_div').appendChild(img);
  }
}

// ************************************************************************************************************
function init(){
    
    document.addEventListener("backbutton", function(e){
        e.stopPropagation();
        
        if(1){
            e.preventDefault();
        }else {
            return true;
        }
    }, false);

    let info_divs = document.getElementsByClassName('info_div');
    for(let i=0; i<info_divs.length; ++i){
        info_divs[i].onclick = load_full_report;
    }

    $("#new_attachment").change(function() {
      readURL(this);
    });

    document.getElementById('plus').onclick = function(){document.getElementById('new_attachment').click();};

}

window.onload = function(){
    if(!("deviceready" in window)){init();}
    else{
        document.addEventListener("deviceready", function(){
            init();
        }, false);
    }
}