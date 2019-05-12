"use strict";
var SERVER = {protocol:'http://', port:3333};
var SERVERS = ['0.0.0.0'];

var URIs = {
    login:'login',
    report:'report',
    update:'update',
    all_crimes:'all_crimes',
    media:'static/media',
    updates:'updates',
}

var USER = 'admin2';

var FETCH_INTERVAL;

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

    let ip = document.getElementById('ip').value;
    if(ip){SERVERS = [ip]}
    else{SERVERS = [document.getElementById('ip').getAttribute('placeholder')]}

    let uname = document.getElementById('uname').value;
    let pswd = document.getElementById('pswd').value;

    if(!uname.length || !pswd.length){
        flag_error('please fill in both fields');
        return;
    }


    let form = new FormData();
    form.append('uname',uname);
    form.append('pswd',pswd);

    request(URIs.login,'post',form,
        function(reply){
            reply = JSON.parse(reply);

            if(!reply.status){
                flag_error(reply.log);
                return;
            }

            USER = uname;
            document.getElementById('rreporter').value = uname;
            show_main_div();

            FETCH_INTERVAL = setInterval(function(){
                let form = new FormData();
                form.append('user',USER);
                request(URIs.updates,'post',form,
                    function(reply){
                        reply = JSON.parse(reply);

                        if(reply.data.length){
                            if(USER=='admin'){
                                show_info('new cases: \n'+reply.data.join('\n'));
                            }else{
                                show_info('new case updates: \n'+reply.data.join('\n'));
                            }
                            
                            view_search(1);
                        }
                    },
                    flag_error
                );        
            },10000);

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

function populate_crimes(data,_=0){
    let mom = document.getElementById('crimes_div');
    if(data.length){
        clear(mom);
        
        for(let i=0; i<data.length; ++i){
            mom.innerHTML += 
                "<div id='info_"+i+"' class='info_div' style='margin-top:50px; border:0px;'>"+
                    "<span class='profile_pic_span'><img class='profile_pic' src='"+
                        SERVER.protocol+SERVERS[0]+':'+SERVER.port+'/static/media/'+data[i][1].dp_path+"'></span>"+
                    "<span class='general_details'>"+
                        "<div class='row'>"+
                            "<label class='key'>Ref NO</label>"+
                            "<span class='value _refNO'>"+data[i][0]+"</span>"+
                        "</div>"+
                        "<div class='row'>"+
                            "<label class='key'>Crime</label>"+
                            "<span class='value'>"+(data[i][1].crime?data[i][1].crime:'-')+"</span>"+
                        "</div>"+
                        "<div class='row'>"+
                            "<label class='key'>Offender</label>"+
                            "<span class='value'>"+(data[i][1].suspect?data[i][1].suspect:'-')+"</span>"+
                        "</div>"+
                    "</span>"+
                "</div>";
            
            //document.getElementById('info_'+i).data = data[i];
        }

        for(let i=0; i<mom.children.length; ++i){mom.children[i].data = data[i];}

        let info_divs = document.getElementsByClassName('info_div');
        for(let i=0; i<info_divs.length; ++i){
            info_divs[i].onclick = load_full_report;
        }

    }else{
        show_info('no results found!');
    }

    if(!_){
        document.getElementById('report_crime_div').style.display = 'none';
        document.getElementById('search_div').style.display = 'block';
    }

}

function view_search(_=0){
    request(URIs.all_crimes,'GET',
        null,
        function(){let d=JSON.parse(this.responseText); populate_crimes(d,_)},
        function(){alert('Error fetching data')},
        0,
        null
    );
}

function update(){
    let progresses = document.getElementById('aprogress_ul').children;

    let prog = []
    for(let i=(progresses.length-1); i>=0; --i){
        if(!progresses[i].children[0].value){flag_error('all progresses must have dates');return;}
        if(!progresses[i].children[1].value){flag_error('all progresses must have events');return;}
        prog.push(progresses[i].children[0].value+'~'+progresses[i].children[1].value);
    }
    document.getElementById('aprogress').value = prog.join('`');
    
    request(URIs.update,'POST',
        new FormData(document.getElementById('admin-update')),
        function(){let d;d=JSON.parse(this.responseText),d.status?show_success('succesfully updated report'):flag_error(d.log);},
        function(){alert('Error sending data')},
        0,
        null
    );    
}

function exit_full_report(){
    document.getElementById('full_report_div').style.display = 'none';
    document.getElementById('search_div').style.display = 'block';
}

function load_full_report(){    
    if(USER!='admin'){
        document.getElementById('profile_pic').src = SERVER.protocol+SERVERS[0]+':'+SERVER.port+'/'+URIs.media+'/'+this.data[1].dp_path;
        
        document.getElementById('inames').innerHTML = this.data[1].suspect?this.data[1].suspect:'-';
        document.getElementById('iage').innerHTML = this.data[1].age?this.data[1].age:'-';
        document.getElementById('isex').innerHTML = this.data[1].sex;
        document.getElementById('irefNO').innerHTML = this.data[0];
        document.getElementById('icrime').innerHTML = this.data[1].crime?this.data[1].crime:'Unspecified';
        document.getElementById('iloc').innerHTML = this.data[1].loc;
        document.getElementById('idate').innerHTML = this.data[1].date + (this.data[1].time?' ['+this.data[1].time+']':'');
        document.getElementById('idesc').innerHTML = this.data[1].desc;
        
        let progresses = this.data[1].progress.split('`');
        let progress = document.getElementById('iprogress'); clear(progress);
        let prog;
        for(let i=(progresses.length-1); i>=0; --i){
            prog = progresses[i].split('~');
            progress.innerHTML += "<li><label>"+prog[0]+"</label><span style='margin-left:10px;'>"+prog[1]+"</span></li>";
            
        }

        let attachments = this.data[1].attachments_list.split(';');

        let attachments_div = document.getElementById('iattachments'); clear(attachments_div);
        if(attachments.length && attachments[0]){
            let img;
            for(let i=0; i<attachments.length; ++i){
                img = document.createElement('img');
                img.setAttribute('class','img-attachment');
                img.setAttribute('src',SERVER.protocol+SERVERS[0]+':'+SERVER.port+'/'+URIs.media+'/'+attachments[i]);
                attachments_div.appendChild(img);
            }
        }
        
        document.getElementById('search_div').style.display = 'none';
        document.getElementById('full_report_div').style.display = 'block';
    }else{
        document.getElementById('aattachments_list').value = this.data[1].attachments_list;
        document.getElementById('adp_path').value = this.data[1].dp_path;
        document.getElementById('aprogress').value = this.data[1].progress;

        document.getElementById('aprofile_pic').src = SERVER.protocol+SERVERS[0]+':'+SERVER.port+'/'+URIs.media+'/'+this.data[1].dp_path;
                
        document.getElementById('areporter').innerHTML = this.data[1].reporter;
        document.getElementById('aareporter').value = this.data[1].reporter;
        
        document.getElementById('anames').value = this.data[1].suspect;
        document.getElementById('aage').value = this.data[1].age;
        document.getElementById('asex').value = this.data[1].sex;
        document.getElementById('arefNO').innerHTML = this.data[0];
        document.getElementById('aarefNO').value = this.data[0];
        document.getElementById('acrime').value = this.data[1].crime?this.data[1].drime:'Unspecified';
        document.getElementById('aloc').value = this.data[1].loc;
        document.getElementById('adate').innerHTML = this.data[1].date + (this.data[1].time?' ['+this.data[1].time+']':'');
        document.getElementById('adesc').value = this.data[1].desc;
        
        let progresses = this.data[1].progress.split('`');
        let progress = document.getElementById('aprogress_ul'); clear(progress);
        let prog, _prog;
        for(let i=0; i<progresses.length; ++i){
            prog = progresses[i].split('~');
            _prog = new_progress();
            _prog[0].value = prog[0];
            _prog[1].value = prog[1];
        }

        let attachments = this.data[1].attachments_list.split(';');

        let attachments_div = document.getElementById('aattachments_div'); clear(attachments_div);
        if(attachments.length && attachments[0]){
            let img;
            for(let i=0; i<attachments.length; ++i){
                img = document.createElement('img');
                img.setAttribute('class','img-attachment');
                img.setAttribute('src',SERVER.protocol+SERVERS[0]+':'+SERVER.port+'/'+URIs.media+'/'+attachments[i]);
                attachments_div.appendChild(img);
            }
        }

        show_modal('admin_modal');
    }

}

function readURL(input) {

  if (input.files && input.files[0]) {    
    if(input.target_div){
        if(!input.dont_clear){clear(document.getElementById(input.target_div));}
        for(let i=0; i<input.files.length; ++i){
            let reader = new FileReader();
            let img = document.createElement('img');
            img.setAttribute('class','img-attachment');

            reader.onload = function(e) {
                img.setAttribute('src', e.target.result);
            }

            reader.readAsDataURL(input.files[i]);

            document.getElementById(input.target_div).appendChild(img);
        }
    }else{
        let reader = new FileReader();
        reader.onload = function(e) {
            input.target_img.setAttribute('src', e.target.result);
        }
        reader.readAsDataURL(input.files[0]);
    }
    
  }
}

function new_progress(){
    //<input type='text' class='form-control value' ></li>
    
    let li = document.createElement('li');
    li.style.float = 'left';
    li.style.width = '100%';
    li.style.marginBottom = '5px';

    let d = document.createElement('input');
    d.setAttribute('type','date');
    d.setAttribute('class','form-control key');
    d.style.maxWidth='150px';
    d.style.marginRight='10px';
    
    li.appendChild(d);

    let input = document.createElement('input');
    input.setAttribute('type','input');
    input.setAttribute('placeholder','event');
    input.setAttribute('class','form-control value');

    li.appendChild(input);

    let mom = document.getElementById('aprogress_ul');
    mom.insertBefore(li,mom.childNodes[0]);

    return [d,input];

}

function send_report(){
    if(!document.getElementById('rdate').value){flag_error('date?');return;}
    if(!document.getElementById('rloc').value){flag_error('Location?');return;}
    if(!document.getElementById('rdesc').value){flag_error('Description?');return;}
    
    request(URIs.report,'POST',
        new FormData(document.getElementById('report-form')),
        function(){
            let d;
            d=JSON.parse(this.responseText),
            d.status?show_success('sent data successfully. your Reference Number is '+d.refNO):
                flag_error(d.log);
            
            document.getElementById('report-form').reset();
            clear(document.getElementById('rattachments_div'));
        },
        function(){alert('Error sending data')},
        0,
        null
    );
}

function filter(){
    let target = document.getElementById('search').value.toLowerCase();
    let results = document.getElementById('crimes_div').children;
    
    for(let i=0; i<results.length; ++i){
        if(results[i].data[0].toLowerCase().indexOf(target)>=0){results[i].style.display = 'block';}
        else{results[i].style.display = 'none';}
    }
}

// ************************************************************************************************************
function init(){
    // to bend text...include the CirleType.min.js file
    new CircleType(document.getElementById('title')).radius(190)/*.dir(-1)//this would reverse the bend*/;    
    
    document.addEventListener("backbutton", function(e){
        e.stopPropagation();
        
        if(1){
            e.preventDefault();
        }else {
            return true;
        }
    }, false);


    document.getElementById('new_attachment').target_div = 'rattachments_div';
    document.getElementById('anew_attachment').target_div = 'aattachments_div';
    document.getElementById('anew_attachment').dont_clear = true;
    document.getElementById('adp').target_img = document.getElementById('aprofile_pic');

    $("#new_attachment").change(function(){readURL(this);});
    $("#anew_attachment").change(function(){readURL(this);});
    $("#adp").change(function(){readURL(this);});

    document.getElementById('plus').onclick = function(){document.getElementById('new_attachment').click();};
    document.getElementById('aplus').onclick = function(){document.getElementById('anew_attachment').click();};
    document.getElementById('aprofile_pic').onclick = function(){document.getElementById('adp').click();};
}

window.onload = function(){
    if(!("deviceready" in window)){init();}
    else{
        document.addEventListener("deviceready", function(){
            init();
        }, false);
    }
}