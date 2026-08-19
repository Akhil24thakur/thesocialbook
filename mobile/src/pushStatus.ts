let current = "not checked";

export function getPushStatus() {
  return current;
}

export function setPushStatus(status: string) {
  current = status;
}