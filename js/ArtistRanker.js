var ArtistRanker = new Object();

// Artist Ranker Configuration
ArtistRanker.Config = new Object();
ArtistRanker.Config.OwnPlaylistArtistWeight = 3;
ArtistRanker.Config.PubPlaylistArtistWeight = 1;

ArtistRanker.ScoreArtistsSinglePlaylist = function(artists, isOwnPlaylist) {
	var rankedArtists = [];
	
	artists.forEach(function(artist) {
		var artistId = artist.id;
		var artistName = artist.name;
	
		var rank;
		if (isOwnPlaylist) {
			rank = ArtistRanker.Config.OwnPlaylistArtistWeight;
		} else {
			rank = ArtistRanker.Config.PubPlaylistArtistWeight;
		}
	
		if (rankedArtists.hasOwnProperty(artistId)) {
			rankedArtists[artistId].rank += rank;
		} else {
			rankedArtists[artistId] = { name: artistName, rank: rank };
		}
	});
	
	return rankedArtists;
};

ArtistRanker.MergePlaylistRanks = function(rankedArtistsByPlaylist) {
	var globalRankMap = {};
	
	for (var playlist in rankedArtistsByPlaylist) {
		if (rankedArtistsByPlaylist.hasOwnProperty(playlist)) {
			// This is a playlist object. It will contain a collection of artists.
			for (var artist in rankedArtistsByPlaylist[playlist]) {
				if (rankedArtistsByPlaylist[playlist].hasOwnProperty(artist)) {
					// Add or update this artist in the global rank.
					if (globalRankMap.hasOwnProperty(artist)) {
						globalRankMap[artist].rank += rankedArtistsByPlaylist[playlist][artist].rank;
					} else {
						globalRankMap[artist] = {
							name: rankedArtistsByPlaylist[playlist][artist].name,
							rank: rankedArtistsByPlaylist[playlist][artist].rank
						};
					}
				}
			}
		}
	}
	
	// Convert the map to an array.
	var globalRank = [];
	for (var entry in globalRankMap) {
		if (globalRankMap.hasOwnProperty(entry)) {
			var obj = globalRankMap[entry];
			obj.id = entry;
			globalRank.push(obj);
		}
	}
	
	// Sort that shit by rank.
	globalRank.sort(function(a,b) {
		return b.rank - a.rank;
	});
	
	return globalRank;
};
