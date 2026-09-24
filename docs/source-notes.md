# YW2 Source Notes

## Sources

### Base A / Base B data

- https://togenyanweb.appspot.com/Yokai/yw2/yokaiList.html
- https://togenyanweb.appspot.com/Yokai/yw2/ivChecker.html

The source table exposes a level-1 endpoint (Base A) and level-99 endpoint (Base B) for HP, Strength, Spirit, Defense, and Speed.

The local sync script parses that public table and emits src/engine/yokaiData.generated.ts.

### Formula and mechanics

- https://yokaiwatch.github.io/characters/stat-guide-ykw2.html

The referenced guide documents the YW2 float32 operation order and reports verification against game code.

Local implementation status: ported from documented, externally verified behavior. This repository has not independently repeated the reverse engineering.

## Implemented formula

For one stat:

```text
delta = f32(IV + BaseB - BaseA)
scaledDelta = f32(delta * 0.0102040814235806465)
growthProduct = f32(scaledDelta * f32(L - 1))
growth = f32(f32(BaseA) + growthProduct)

trainingScaleProduct = f32(f32(L) * 0.005050505045801401)
trainingScale = f32(f32(1) + trainingScaleProduct)
trainingProduct = f32(f32(EV) * trainingScale)
withTraining = f32(growth + trainingProduct)
withFitness = f32(withTraining + f32(Fitness))

Raw = clamp(trunc(withFitness), 1, 999)
Displayed = max(1, Raw + Equipment)
```

## Reverse-search constraints

```text
HP_IV / 2 + STR_IV + SPR_IV + DEF_IV + SPD_IV = 40
```

HP IV is searched in even steps from 0 to 80. The other IVs are searched from 0 to 40.

The implementation first solves each stat independently against the observed displayed stat, then combines only candidate tuples whose weighted total is exactly 40.

## Regression fixture

The public guide gives a worked Thornyan example using IV 16/8/8/8/8.

At level 40 with no EV:
- 169 / 79 / 68 / 71 / 91

At level 40 with 10 Strength EV and 10 Spirit EV:
- 169 / 91 / 80 / 71 / 91

At level 99 with the same EVs:
- 360 / 182 / 161 / 151 / 195

These values are covered by tests.
