import test from "node:test";
import assert from "node:assert/strict";
import { experiments } from "./experiments.ts";
import {
  phetSimulations,
  recommendedPhet,
  phetPage,
  phetEmbed,
} from "./phet.ts";
test("every topic has a curated official PhET resource with an explicit model boundary", () => {
  assert.equal(phetSimulations.length, 5);
  for (const experiment of experiments) {
    const { simulation, connection } = recommendedPhet(experiment.id);
    assert.ok(connection.length > 20);
    assert.ok(
      simulation.focus.length > 20 && simulation.limitation.length > 20,
    );
    assert.equal(
      new URL(phetPage(simulation.slug)).hostname,
      "phet.colorado.edu",
    );
    assert.equal(
      new URL(phetEmbed(simulation.slug)).hostname,
      "phet.colorado.edu",
    );
    assert.match(
      phetEmbed(simulation.slug),
      new RegExp(`/latest/${simulation.slug}_pt_BR\\.html$`),
    );
  }
});
