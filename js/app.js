function d(msg) {
	$("#debug").html($("#debug").html() + msg + "\n");
}

function ConcertManViewModel() {
	var self = this;

	this.SpotifyAccessToken = $.cookie("spotify_access_token");
	this.SpotifyUserId = $.cookie("spotify_user_id");
	this.SpotifyPlaylists = ko.observableArray();
	this.SpotifyHelper = new SpotifyHelper(this.SpotifyAccessToken);
	
	this.SpotifyHelper.WriteAccessTokenCookie();
	
	this.spotifyAuthorize = function() {
		this.SpotifyHelper.RedirectToSpotifyAuth();
	};
	
	this.spotifyGetArtists = function() {
		if (null == this.SpotifyUserId) {
			self.SpotifyHelper.SpotifyApi.GetUserId(this.SpotifyAccessToken, function (userId) {
				this.SpotifyUserId = userId;
				$.cookie("spotify_user_id", userId);
			});
		};
		
		self.SpotifyHelper.SpotifyApi.GetAllPlaylists(this.SpotifyUserId, function (allPlaylists){
			allPlaylists.forEach(function(playlist) {
				// Set the "mine" flag if the playlist is owned by the current user.
				if (playlist.owner.id == self.SpotifyUserId) {
					playlist.mine = true;
				} else {
					playlist.mine = false;
				}
				
				self.SpotifyPlaylists.push(playlist);
			});
		});
	};
}

// Export 'cvm' for the debug window.
var cvm = new ConcertManViewModel();

ko.applyBindings(cvm);