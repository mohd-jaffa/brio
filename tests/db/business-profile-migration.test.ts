import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/0008_business_profile.sql"), "utf8");

/**
 * The contract of 0008 (plan §139.11.2, §56, §118). Proved on the local
 * database as well: the owner edits their business and no other, a direct
 * UPDATE from a client is refused, a reference into another business's folder
 * breaks the shape check, and storage shows each business only its own logo.
 */
describe("business profile migration", () => {
  it("adds the catch phrase and city, bounded as the schema is", () => {
    expect(migration).toMatch(/add column if not exists tagline text/);
    expect(migration).toMatch(/add column if not exists city text/);
    expect(migration).toMatch(/char_length\(btrim\(business_name\)\) between 2 and 160/);
    expect(migration).toMatch(/tagline is null or char_length\(btrim\(tagline\)\) between 1 and 80/);
    expect(migration).toMatch(/city is null or char_length\(btrim\(city\)\) between 2 and 80/);
    expect(migration).toMatch(/address is null or char_length\(btrim\(address\)\) between 1 and 300/);
  });

  it("keeps a logo reference inside the business's own folder, with one of three types", () => {
    expect(migration).toMatch(/rename column logo to logo_path/);
    expect(migration).toMatch(/logo_path ~ \('\^bakeries\/' \|\| id::text \|\| '\/logo\//);
    expect(migration).toMatch(/logo_mime_type in \('image\/png', 'image\/jpeg', 'image\/webp'\)/);
    expect(migration).toMatch(/\(logo_path is null\) = \(logo_mime_type is null\)/);
  });

  it("edits only through owner-checked functions, for signed-in users only", () => {
    for (const fn of ["update_business_profile", "set_business_logo"]) {
      expect(migration).toMatch(
        new RegExp(`function public\\.${fn}\\([\\s\\S]*?security definer\\s+set search_path = ''`),
      );
      expect(migration).toMatch(new RegExp(`revoke all on function public\\.${fn}\\(.*\\) from public, anon;`));
      expect(migration).toMatch(new RegExp(`grant execute on function public\\.${fn}\\(.*\\) to authenticated;`));
    }
    expect(
      migration.match(/b\.id = (public\.current_profile_bakery_id\(\)|business)\s+and b\.owner_id = auth\.uid\(\)/g),
    ).toHaveLength(2);
  });

  it("refuses to point a business at a logo file that was never stored", () => {
    expect(migration).toMatch(/not exists \(\s*select 1 from storage\.objects/);
    expect(migration).toMatch(/hint = 'UPLOAD_FAILED'/);
  });

  it("takes back the write grants a signed-in user was never meant to have", () => {
    expect(migration).toMatch(
      /revoke insert, update, delete, truncate, references, trigger on public\.bakeries, public\.profiles from authenticated;/,
    );
  });

  it("keeps logos in a private, limited bucket, reachable only inside the caller's own folder", () => {
    expect(migration).toMatch(
      /'business-logos', 'business-logos', false, 512000, array\['image\/png', 'image\/jpeg', 'image\/webp'\]/,
    );
    for (const action of ["select", "insert", "delete"]) {
      expect(migration).toMatch(
        new RegExp(
          `create policy business_logos_${action}_own[\\s\\S]*?\\(storage\\.foldername\\(name\\)\\)\\[2\\] = public\\.current_profile_bakery_id\\(\\)::text`,
        ),
      );
    }
    expect(migration).not.toMatch(/business_logos_update/);
  });
});
