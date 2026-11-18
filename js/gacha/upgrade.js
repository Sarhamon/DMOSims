import { fusions } from './fusionData.js';
import { gradeRank, pullWeighted } from './common.js';

const upgradeMap = {};
for (const group of fusions) {
    const G = group.inputGrade;
    const upper = group.results.filter(r => gradeRank(r.grade) < gradeRank(G));
    if (upper.length === 0) continue;
    const rate = upper.reduce((s, r) => s + r.probability, 0);
    const upperGrade = upper[0].grade;
    const upperGroup = fusions.find(g => g.inputGrade === upperGrade);
    const pool = upperGroup
        ? upperGroup.results.filter(r => r.grade === upperGrade)
        : upper;
    upgradeMap[G] = { rate, pool, upperGrade };
}

export function maybeUpgrade(item, scope) {
    const entry = upgradeMap[item.grade];
    const passthrough = { name: item.name, grade: item.grade, _upgraded: false };
    if (!entry) return passthrough;
    if (Math.random() * 100 >= entry.rate) return passthrough;
    let pool = entry.pool;
    if (scope) {
        pool = scope.filter(r => r.grade === entry.upperGrade);
        if (pool.length === 0) return passthrough;
    }
    const picked = pullWeighted(pool);
    return {
        name: picked.name,
        grade: picked.grade,
        _upgraded: true,
        _orig: { name: item.name, grade: item.grade },
    };
}
