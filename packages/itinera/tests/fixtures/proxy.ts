/** A proxy already revoked, so that anything asked of it throws. */
export function revoked(): object {
  const { proxy, revoke } = Proxy.revocable({}, {});
  revoke();
  return proxy;
}
