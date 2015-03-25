$(function(){

	setTimeout(function(){
		var toDoList = getTodoList();

		for(var i in toDoList){
			getIssueDetail(toDoList[i]);	
		}
	}, 1000);
	
});


function getTodoList (argument) {
	var hrefElementArray = $('.ghx-swimlane .ghx-heading a[href^="/browse/"]');
	if(!hrefElementArray.length){
		return;
	}

	var toDoList = [];
	for(var hrefIndex in hrefElementArray){
		var href = hrefElementArray[hrefIndex];

		var key = $(href).text();

		if(!key){
			break;
		}

		var item = {};
		item.element = $(href);
		item.key = key;
		toDoList.push(item);
	}

	return toDoList;
}

function getIssueDetail(item){
	var href = "https://jira.englishtown.com/rest/api/2/issue/" + item.key;
	$.getJSON(href,
			null,
			function(result){
				
				item.id = result.id;
				item.issuetype = result.fields.issuetype;
				if(result.fields){
					item.status = result.fields.status;
				}

				checkStatus(item);
			});
}

function checkStatus (item) {
	
	if(item.issuetype.name == "Story"){
		var ignoreStatus = [1,3,4,10001,10003,10006,10008,10072,10074];
		if(ignoreStatus.filter(function(value){return value===item.status.id;}) > 0) 
			return;
	}else if(item.issuetype.name == "Bug"){
		if(item.status.id != "6"){
			return;
		}
	}else{
		return;
	}
	
	getPullReuqestInfo(item);
}

function getPullReuqestInfo(item){
	var href = "https://jira.englishtown.com/rest/dev-status/1.0/issue/detail?issueId=" + item.id + "&applicationType=stash&dataType=pullrequest";
	$.getJSON(href,
			null,
			function(result){
				if(!result || !result.detail || !result.detail.length){
					return;
				}

				var detail = result.detail[0];
				item.pullRequests = detail.pullRequests;
				item.branches = detail.branches;

				checkPullRequest(item);
				
			});
}

function checkPullRequest (item) {
	if(!item.branches || !item.branches.length){
		return;
	}

	for(var i in item.branches){
		var branch = item.branches[i];

		var existsDevelopBranch = false;

		if(item.pullRequests){
			for(var j in item.pullRequests){
				var pull = item.pullRequests[j];
				if(branch.repository.url == pull.source.repository.url &&
					pull.destination.branch == "develop"){
					existsDevelopBranch = true;
					break;
				}
			}
		}

		branch.existsDevelopBranch = existsDevelopBranch;
	}

	setUI(item);
}

function setUI(item){
	var branchNeedPull = [];
	for(var i in item.branches){
		var branch = item.branches[i];
		if(!branch.existsDevelopBranch){
			branchNeedPull.push(branch);
			//break;
		}
	}

	if(!branchNeedPull.length){
		return;
	}

	var parent = item.element.parent().parent();
	var template = '<div class="ghx-bandaid" style="margin-top:5px;margin-right:14px;"><a class="aui-button">Pull request(' + branchNeedPull.length + ')</a></div>';
	var buttonContainer = $(template);
	parent.append(buttonContainer);

	var button = buttonContainer.find('a');
	button.click(function (event) {
		event.preventDefault();

		var branch = branchNeedPull.pop();
		if(!branchNeedPull.length){
			button.parent().hide();
			button.unbind();
		}else{
			button.text('Pull request(' + branchNeedPull.length + ')');
		}

		var name = branch.name;
		
		/*
		if(name.indexOf('team\/') == 0){
			var index = name.indexOf("\/", 5);
			if(index != -1){
				name = name.substring(0, index + 1);
				name = "refs/heads/" + name + "develop";
			}
		}else{
			name = "";
		}
		*/

		name = "refs/heads/" + branch.name;

		var url = branch.repository.url;
		url = url.substring(0, url.length - 7);
		url = url + '/pull-requests?create&targetBranch=refs%2Fheads%2Fdevelop&sourceBranch=' + encodeURIComponent(name);
		
		openNewTab(url);

		return false;
	});
}

function openNewTab (url) {
	chrome.runtime.sendMessage({newTab: true, url: url}, function(response) {
  	
	});
}