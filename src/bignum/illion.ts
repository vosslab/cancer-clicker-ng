const MAX_NAMED_GROUP = 1001;

function requireGroup(group: number): void {
  if (!Number.isSafeInteger(group) || group < 0) {
    throw new Error("Illion group must be a nonnegative safe integer.");
  }
}

function unitRoot(unit: number): string {
  switch (unit) {
    case 0:
      return "";
    case 1:
      return "un";
    case 2:
      return "duo";
    case 3:
      return "tre";
    case 4:
      return "quattuor";
    case 5:
      return "quinqua";
    case 6:
      return "se";
    case 7:
      return "septe";
    case 8:
      return "octo";
    case 9:
      return "nove";
    default:
      throw new Error("Illion unit must be a decimal digit.");
  }
}

function tensRoot(tens: number): string {
  switch (tens) {
    case 0:
      return "";
    case 1:
      return "dec";
    case 2:
      return "vigint";
    case 3:
      return "trigint";
    case 4:
      return "quadragint";
    case 5:
      return "quinquagint";
    case 6:
      return "sexagint";
    case 7:
      return "septuagint";
    case 8:
      return "octogint";
    case 9:
      return "nonagint";
    default:
      throw new Error("Illion tens must be a decimal digit.");
  }
}

function hundredsRoot(hundreds: number): string {
  switch (hundreds) {
    case 0:
      return "";
    case 1:
      return "cent";
    case 2:
      return "ducent";
    case 3:
      return "trecent";
    case 4:
      return "quadringent";
    case 5:
      return "quingent";
    case 6:
      return "sescent";
    case 7:
      return "septingent";
    case 8:
      return "octingent";
    case 9:
      return "nongent";
    default:
      throw new Error("Illion hundreds must be a decimal digit.");
  }
}

function unitAssimilation(unit: number, following: number, beforeTens: boolean): string {
  if (unit === 3) {
    if (beforeTens) {
      return following === 2 ||
        following === 3 ||
        following === 4 ||
        following === 5 ||
        following === 8
        ? "s"
        : "";
    }
    if (following === 8) {
      return "x";
    }
    return following === 1 ||
      following === 3 ||
      following === 4 ||
      following === 5 ||
      following === 6 ||
      following === 9
      ? "s"
      : "";
  }
  if (unit === 6) {
    if (beforeTens) {
      if (following === 8) {
        return "x";
      }
      return following === 2 || following === 3 || following === 4 || following === 5 ? "s" : "";
    }
    if (following === 1 || following === 8) {
      return "x";
    }
    return following === 3 || following === 4 || following === 5 ? "s" : "";
  }
  if (unit === 7 || unit === 9) {
    if (beforeTens) {
      if (following === 2 || following === 8) {
        return "m";
      }
      return following === 1 ||
        following === 3 ||
        following === 4 ||
        following === 5 ||
        following === 6 ||
        following === 7
        ? "n"
        : "";
    }
    if (following === 8) {
      return "m";
    }
    return following >= 1 && following <= 7 ? "n" : "";
  }
  return "";
}

function lowIllionName(ordinal: number): string {
  switch (ordinal) {
    case 1:
      return "million";
    case 2:
      return "billion";
    case 3:
      return "trillion";
    case 4:
      return "quadrillion";
    case 5:
      return "quintillion";
    case 6:
      return "sextillion";
    case 7:
      return "septillion";
    case 8:
      return "octillion";
    case 9:
      return "nonillion";
    default:
      throw new Error("Low illion ordinal must be in 1..9.");
  }
}

function authenticIllionName(ordinal: number): string {
  if (ordinal >= 1 && ordinal <= 9) {
    return lowIllionName(ordinal);
  }
  if (ordinal === 1000) {
    return "millinillion";
  }

  const hundreds = Math.floor(ordinal / 100);
  const remainder = ordinal % 100;
  const tens = Math.floor(remainder / 10);
  const units = remainder % 10;
  const followsTens = tens > 0;
  const following = followsTens ? tens : hundreds;
  const unitPrefix = unitRoot(units);
  const assimilation = unitAssimilation(units, following, followsTens);
  const tensPrefix = tensRoot(tens);
  const linker = tens > 0 && hundreds > 0 ? (tens <= 2 ? "i" : "a") : "";
  const hundredsPrefix = hundredsRoot(hundreds);
  const name = `${unitPrefix}${assimilation}${tensPrefix}${linker}${hundredsPrefix}illion`;
  return name;
}

export function shortSuffixForGroup(group: number): string | undefined {
  requireGroup(group);
  switch (group) {
    case 0:
      return "";
    case 1:
      return "K";
    case 2:
      return "M";
    case 3:
      return "B";
    case 4:
      return "T";
    case 5:
      return "Qa";
    case 6:
      return "Qi";
    case 7:
      return "Sx";
    case 8:
      return "Sp";
    case 9:
      return "Oc";
    case 10:
      return "No";
    case 11:
      return "Dc";
    default:
      return undefined;
  }
}

export function illionNameForGroup(group: number): string | undefined {
  requireGroup(group);
  if (group < 2 || group > MAX_NAMED_GROUP) {
    return undefined;
  }

  const ordinal = group - 1;
  const authenticName = authenticIllionName(ordinal);
  if (ordinal === 27) {
    return "septenvigintillion";
  }
  return authenticName;
}
