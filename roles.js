module.exports = function (context, match) {

    let homeScore = 0;
    let awayScore = 0;
    let homeContext = context[match['home']];
    let awayContext = context[match['away']];

    //jogadores
    homeContext.attackForce = 0;
    homeContext.defenceForce = 0;
    awayContext.attackForce = 0;
    awayContext.defenceForce = 0;

    if (homeContext.goalsOnLastCups > awayContext.goalsOnLastCups) {
        homeScore += 2;
    } else if (homeContext.goalsOnLastCups < awayContext.goalsOnLastCups) {
        awayScore += 2;
    }

    if (homeContext.previousFinals > awayContext.previousFinals) {
        homeScore += 2;
    } else if (homeContext.previousFinals < awayContext.previousFinals) {
        homeScore += 2;
    }

    if (homeContext.previousSemifinals > awayContext.previousSemifinals) {
        homeScore++;
    } else if (homeContext.previousSemifinals < awayContext.previousSemifinals) {
        awayScore++;
    }

    if (homeContext.fifaRankPoints > awayContext.fifaRankPoints) {
        homeScore++;
    } else if (homeContext.fifaRankPoints < awayContext.fifaRankPoints) {
        awayScore++;
    }

    homeContext.winner = homeScore > awayScore;
    awayContext.winner = awayScore > homeScore;

    awayContext.players = awayContext.players.sort(function (a, b) {
        return a.Rank - b.Rank;
    }).slice(0, 15);

    homeContext.players = homeContext.players.sort(function (a, b) {
        return a.Rank - b.Rank;
    }).slice(0, 15);

    homeContext.players.forEach(item => {
        homeContext.attackForce += item.Agility
        homeContext.attackForce += item.Finishing
        homeContext.attackForce += item.Composure
        homeContext.attackForce += item.Stamina
        homeContext.attackForce += item.Jumping
    });

    homeContext.players.forEach(item => {
        homeContext.defenceForce += item.Jumping
        homeContext.defenceForce += item.Vision
        homeContext.defenceForce += item.Marking
        homeContext.defenceForce += item.Aggression
        homeContext.defenceForce += item.Strength
    });

    awayContext.players.forEach(item => {
        awayContext.attackForce += item.Agility
        awayContext.attackForce += item.Finishing
        awayContext.attackForce += item.Composure
        awayContext.attackForce += item.Stamina
        awayContext.attackForce += item.Jumping;
    });

    awayContext.players.forEach(item => {
        awayContext.defenceForce += item.Jumping
        awayContext.defenceForce += item.Vision
        awayContext.defenceForce += item.Marking
        awayContext.defenceForce += item.Aggression
        awayContext.defenceForce += item.Strength
    });

    homeContext.attackForce = homeContext.attackForce / 6;
    homeContext.defenceForce = homeContext.defenceForce / 6;
    awayContext.attackForce = awayContext.attackForce / 6;
    awayContext.defenceForce = awayContext.defenceForce / 6;

    let homeScoreGoals = homeContext.attackForce / awayContext.defenceForce;
    let awayScoreGoals = awayContext.attackForce / homeContext.defenceForce;

    return [match['home'], getCurrentGoals(homeScoreGoals),  getCurrentGoals(awayScoreGoals), match['away']];
}

function getCurrentGoals(value, score) {
    value = value * 100;
    if (value > 96 && value < 105) {
        return 1;
    } else if (value > 105 && value < 118) {
        return 2;
    } else if (value > 118) {
        return 3;
    } else {
        if (score > 2) {
            return 1;
        }
        return 0;
    }
}