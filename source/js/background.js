


chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension");

    if (request.newTab){
    	chrome.tabs.create({ url: request.url , active: false});
	}
  });