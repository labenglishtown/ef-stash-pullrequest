$(function(){

	setTimeout(function(){
		var toDoList = getTodoList();

		for(var i in toDoList){
			getIssueDetail(toDoList[i]);	
		}
	}, 1000);
	
});

function getTodoList (argument) {
	var toDoList1 = getTodoListBlock(argument);
	var toDoList2 = getTodoListItem(argument);
	var toDoList3 = getTodoListFilterItem(argument);
	var toDoList4 = getTodoListFilterItemDetail(argument);

	var todoList = [];
	todoList = appendArray(toDoList1, todoList);
	todoList = appendArray(toDoList2, todoList);
	todoList = appendArray(toDoList3, todoList);
	todoList = appendArray(toDoList4, todoList);

	return todoList;
}

function appendArray(source, target){
	if(source && target){
		for(var i =0;i<source.length;i++){
			var tmp = source[i];
			target.push(tmp);
		}
	}

	return target;
}

function getTodoListBlock (argument) {
	var toDoList = [];

	var hrefElementArray = $('.ghx-swimlane .ghx-heading a[href^="/browse/"]');
	if(!hrefElementArray.length){
		return toDoList;
	}
	
	for(var hrefIndex = 0; hrefIndex < hrefElementArray.length; hrefIndex++){
		var href = hrefElementArray[hrefIndex];

		var key = $(href).text();

		if(!key){
			continue;
		}

		/*
		// debug
		if(key != "RIO2016-660"){
			continue;
		}*/

		var item = {};
		item.element = $(href);
		item.key = key;
		item.type = 'block';
		toDoList.push(item);
	}

	return toDoList;
}

function getTodoListItem (argument) {
	var toDoList = [];

	var hrefElementArray = $('.ghx-swimlane');
	if(!hrefElementArray.length){
		return toDoList;
	}
	var container = hrefElementArray.eq(hrefElementArray.length - 1);
	container = container.find('.ghx-columns .ghx-column:last');
	var items = container.find('.js-detailview');

	for(var i = 0; i < items.length; i++){
		var domItem = items[i];
		var a = $(domItem).find('.ghx-key a');
		var key = a.text();
		if(!key){
			continue;
		}

		var item = {};
		item.element = $(domItem);
		item.key = key;
		item.type = 'item';
		toDoList.push(item);
	}

	return toDoList;
}


function getTodoListFilterItem (argument) {
	var toDoList = [];

	var items = $('#issuetable tbody tr .issuekey');
	if(!items.length){
		return toDoList;
	}

	for(var i = 0; i < items.length; i++){
		var domItem = items[i];
		var a = $(domItem).find('a');
		var key = a.text();
		if(!key){
			continue;
		}

		var item = {};
		item.element = $(domItem);
		item.key = key;
		item.type = 'filter_item';
		toDoList.push(item);
	}

	return toDoList;
}

function getTodoListFilterItemDetail (argument) {
	var toDoList = [];

	var items = $('.issue-list li');
	if(!items.length){
		return toDoList;
	}

	for(var i = 0; i < items.length; i++){
		var domItem = items[i];
		var a = $(domItem).find('a .issue-link-key');
		var key = a.text();
		if(!key){
			continue;
		}

		var item = {};
		item.element = $(domItem);
		item.key = key;
		item.type = 'filter_item_detail';
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
		var ignoreStatus = ["1","3","4","10001","10003","10006","10008","10072","10074"];
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
		}
	}

	if(!branchNeedPull.length){
		return;
	}

	function clickme (event) {
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
		}

	if(item.type == "block"){
		var parent = item.element.parent().parent();
		var template = '<div class="ghx-bandaid" style="margin-top:5px;margin-right:14px;"><a class="aui-button">Pull request(' + branchNeedPull.length + ')</a></div>';
		var buttonContainer = $(template);
		parent.append(buttonContainer);

		var button = buttonContainer.find('a');
		button.click(clickme);
	}else if(item.type == "item"){
		var button = $('<div><button class="aui-button js-sync">Pull Request(' + branchNeedPull.length + ')</button></div>');
		item.element.append(button);

		button = button.find('button')
		button.click(clickme);
	}else if(item.type == "filter_item"){
		var button = $('<div><button class="aui-button js-sync">Pull Request(' + branchNeedPull.length + ')</button></div>');
		item.element.append(button);

		button = button.find('button')
		button.click(clickme);
	}else if(item.type == "filter_item_detail"){
		var button = $('<div><button class="aui-button js-sync">Pull Request(' + branchNeedPull.length + ')</button></div>');
		item.element.append(button);

		button = button.find('button')
		button.click(clickme);
	}
}

function openNewTab (url) {
	chrome.runtime.sendMessage({newTab: true, url: url}, function(response) {
  	
	});
}