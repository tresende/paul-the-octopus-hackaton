const options = {
  projectId: 'paul-the-octopus-hackaton'
};
const bigquery = new require('@google-cloud/bigquery')(options);
const storage = new require('@google-cloud/storage')(options);
const predictMatch = new require('./roles');

// change the bucket name to the one that was created for you
const bucket = 'ciandt_octopus_thiago__dot__gcresende__at__gmail__dot__com';


function predict() {
  let matchesQueryPromise = bigquery.query({
    query: `SELECT TRIM(home) as home,
                   TRIM(away) as away
              FROM \`paul_the_octopus_dataset.matches\``,
    useLegacySql: false
  });

  let fifaRankQueryPromise = bigquery.query({
    query: `SELECT * FROM \`paul_the_octopus_dataset.fifa_rank\``,
    useLegacySql: false
  });

  let teamsStatsQueryPromise = bigquery.query({
    query: `SELECT * FROM \`paul_the_octopus_dataset.teams\``,
    useLegacySql: false
  });

  let playersQueryPromise = bigquery.query({
    query: `SELECT s.* FROM \`paul_the_octopus_dataset.sofifa_players_2018\` s`,
    useLegacySql: false
  });

  let scoreAverageQueryPromise = bigquery.query({
    query: `  SELECT team,
                     sum(score) as goas_on_last_3_cups,
                     avg(score) as average_score
                FROM (
                        SELECT year,
                               REPLACE(
                                 REPLACE(home, "Iran", "IR Iran"),
                                 "North Korea", "Korea Republic") as team,
                               home_score as score
                          FROM \`paul_the_octopus_dataset.matches_history\`

                      UNION ALL

                        SELECT year,
                               REPLACE(
                                 REPLACE(away, "Iran", "IR Iran"),
                                 "North Korea", "Korea Republic") as team,
                               away_score as score
                          FROM \`paul_the_octopus_dataset.matches_history\`
                      )
               WHERE year >= 2002
            GROUP BY team
            ORDER BY team`,
    useLegacySql: false
  });

  return Promise.all([matchesQueryPromise, fifaRankQueryPromise, teamsStatsQueryPromise, scoreAverageQueryPromise, playersQueryPromise])
    .then(promisesResults => {
      let matches = promisesResults[0][0];
      let fifaRank = promisesResults[1][0];
      let teamsStats = promisesResults[2][0];
      let scoreAverage = promisesResults[3][0];
      let players = promisesResults[4][0];
      let context = createPredictionContext(matches, fifaRank, teamsStats, scoreAverage, players);

      function compare(a, b) {
        if (a.score > b.score)
          return -1;
        if (a.score < b.score)
          return 1;
        return 0;
      }
      players.sort(compare);

      // matches = matches.slice(0, 10);
      return matches.map(match => {
        return predictMatch(context, match);
      });
    })
    .then(results => {
      const csv = 'home,home_score,away_score,away\n' + results.map(row => row.join(',')).join('\n');

      const file = storage.bucket(bucket).file('predictions.csv');
      return file.save(csv, {
        metadata: {
          contentType: 'text/plain'
        },
        resumable: false
      });

    }).catch(err => {
      console.log(err);
      throw err;
    })
}

function createPredictionContext(matches, fifaRank, teamsStats, scoreAverage, players) {
  let context = {};

  let fifaRankMap = fifaRank.reduce((map, obj) => {
    map[obj.Team] = obj.Total_Points;
    return map;
  }, {});

  let teamsStatsMap = teamsStats.reduce((map, obj) => {
    map[obj.Team] = {
      'previousAppearances': obj.Previous__appearances,
      'previousTitles': obj.Previous__titles,
      'previousFinals': obj.Previous__finals,
      'previousSemifinals': obj.Previous__semifinals
    };

    return map;
  }, {});

  let scoreAverageMap = scoreAverage.reduce((map, obj) => {
    let key = obj.team;
    map[obj.team] = {
      'goalsOnLastCups': obj.goas_on_last_3_cups,
      'averageScore': obj.average_score,
    };

    return map;
  }, {});

  matches.forEach(match => {
    let team = null;

    if (!context[match['home']]) {
      team = match['home'];
    } else if (!context[match['away']]) {
      team = match['away'];
    }

    let teamsAlreadyProcessed = (team == null);
    if (teamsAlreadyProcessed) {
      return;
    }

    context[team] = Object.assign({
        'players': players.filter(player => player.Nationality == team),
        'fifaRankPoints': fifaRankMap[team],
        'goalsOnLastCups': (scoreAverageMap[team] && scoreAverageMap[team].goalsOnLastCups) || 0,
        'averageScore': (scoreAverageMap[team] && scoreAverageMap[team].averageScore) || 0
      },
      teamsStatsMap[team]
    );
  });


  return context;
}

// To run locally, uncomment the line below and comment the exports block.
predict();

// Update the exported function to a unique name that identifies your function
exports.WINNER_CODE = (req, res) => {
  predict().then(() => {
    res.status(200).send("ok\n");
  }).catch(err => {
    res.status(500).send(err);
  });
}