// What `sendData`'s third argument turns into on the wire.
//
// Build and run:
//   npx esbuild test/ipc-body.test.ts --bundle --platform=node --outfile=/tmp/t.cjs && node /tmp/t.cjs
//
// The device reads `Packet.body` to decide where a payload goes, so the arm this picks is
// the whole routing decision. Getting it wrong sends operator input to the wrong socket, or
// to a device that cannot see an endpoint at all.

import { ipcBody, IpcOptions } from "../src/peer/rtc-peer";
import { Packet } from "../src/proto/packet";

let failures = 0;

function check(ok: boolean, what: string) {
  console.log((ok ? "  ok   " : "  FAIL ") + what);
  if (!ok) {
    failures++;
  }
}

function roundTrip(payload: Uint8Array, options?: IpcOptions): Packet {
  return Packet.decode(Packet.encode(Packet.create(ipcBody(payload, options))).finish());
}

const payload = new Uint8Array([1, 2, 3, 4, 5]);

console.log("[1] no options keeps the unaddressed body an older device understands");
{
  const p = roundTrip(payload);
  check(p.raw !== undefined, "body is `raw`");
  check(p.ipc === undefined, "and not `ipc`");
  check(p.raw?.length === 5 && p.raw[0] === 1, "payload survived");
}

console.log("[2] naming an endpoint switches to the addressed body");
{
  const p = roundTrip(payload, { endpoint: "gamepad", sequence: 42 });
  check(p.ipc !== undefined, "body is `ipc`");
  check(p.raw === undefined, "and not `raw`");
  check(p.ipc?.endpoint === "gamepad", "endpoint carried");
  check(p.ipc?.sequence === 42, "sequence carried");
  check(p.ipc?.payload?.length === 5 && p.ipc.payload[0] === 1, "payload survived");
}

console.log("[3] options without an endpoint still address the default socket");
{
  const p = roundTrip(payload, { sequence: 7 });
  check(p.ipc !== undefined, "body is `ipc`");
  check(p.ipc?.endpoint === "", "endpoint defaults to the empty name");
  check(p.ipc?.sequence === 7, "sequence carried");
}

console.log("[4] an endpoint with no sequence opts out of stale-dropping");
{
  const p = roundTrip(payload, { endpoint: "gamepad" });
  check(p.ipc?.endpoint === "gamepad", "endpoint carried");
  check(p.ipc?.sequence === 0, "sequence is zero, which the device reads as unsequenced");
}

console.log("[5] an empty payload is still a message, not an absent one");
{
  const p = roundTrip(new Uint8Array(), { endpoint: "gamepad", sequence: 1 });
  check(p.ipc !== undefined, "body is `ipc`");
  check(p.ipc?.payload?.length === 0, "payload is empty rather than missing");
}

console.log(failures === 0 ? "\nALL PASSED" : `\nFAILURES: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
