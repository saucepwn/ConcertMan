var JsRateLimiter = function(rateLimit_p, rateIntervalMillis_p) {
	var self = this;
	
	var rateIntervalMillis = rateIntervalMillis_p;
	var rateLimit = rateLimit_p;
	
	var rateWindowBegin = 0;
	var rateWindowQueries = 0;
	
	var idCounter = 0;
	var totalRequestsQueued = 0;
	var totalRequestsServed = 0;
	
	var requestQueue = new Queue();
	
	function BuildNewRateWindowIfNecessary() {
		var now = new Date().getTime();
		if (now - rateIntervalMillis > rateWindowBegin) {
			// We need to create a new rate window.
			rateWindowBegin = now;
			rateWindowQueries = 0;
		}
	};
	
	// Gets the number of milliseconds until the current rate window expires.
	function GetMillisUntilRateWindowEnd() {
		var now = new Date().getTime();
		return rateWindowBegin + rateIntervalMillis - now;
	};
	
	// Returns true if there are enqueued tasks waiting to be run.
	function IsQueueWaiting() {
		return !requestQueue.isEmpty();
	};
	
	this.GetTotalRequestsQueued = function() {
		return totalRequestsQueued;
	};
	
	this.GetTotalRequestsServed = function() {
		return totalRequestsServed;
	};
	
	// Serves all queued requests until the rate window is hit or the queue is emptied, whichever
	// comes first.
	this.FlushQueue = function() {
		// Check to see if we're currently in a rate window, or if we need to create one.
		BuildNewRateWindowIfNecessary();
		
		while (rateWindowQueries < rateLimit && IsQueueWaiting()) {
			var req = requestQueue.dequeue();
			
			d("Dequeuing request " + req.id + " and running at " + new Date().getTime());
			
			req.ftn();
			rateWindowQueries++;
			totalRequestsServed++;
		}
		
		// If there are still tasks waiting in the queue, schedule another flush.
		if (IsQueueWaiting()) {
			setTimeout(self.FlushQueue, GetMillisUntilRateWindowEnd());
		} else {
			d("Queue empty!");
		}
	};
	
	// Add a new function to the rate-limited queue.
	this.QueueRequest = function(request) {
		// Check to see if we're currently in a rate window, or if we need to create one.
		BuildNewRateWindowIfNecessary();
		var thisId = idCounter++;
		totalRequestsQueued++;
		
		if (IsQueueWaiting()) {
			// There are other tasks waiting. Enqueue this task.
			d("Queueing request " + thisId);
			requestQueue.enqueue({ id: thisId, ftn: request });
			
		} else if (rateWindowQueries >= rateLimit) {
			// There are no tasks waiting, but the rate window is full. Enqueue the task and
			// schedule a queue flush.
			requestQueue.enqueue({ id: thisId, ftn: request });
			setTimeout(self.FlushQueue, GetMillisUntilRateWindowEnd());
			
		} else {
			// The rate window is not full. Run the task immediately.
			d("Executing request " + thisId + " immediately");
			request();
			totalRequestsServed++;
		}
	};
};