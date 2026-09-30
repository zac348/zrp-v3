"""Apply the additive migration using the existing Cloud Shell CLI login.
Credentials are read in memory and are never printed or copied into the repo.
"""
import json, os, pathlib, urllib.request, urllib.error
project = 'jrowfpgezkfeyzfyzfps'
token = os.environ.get('SUPABASE_ACCESS_TOKEN') or (pathlib.Path.home()/'.supabase/access-token').read_text().strip()
query = pathlib.Path('supabase/migrations/202609300001_delivery_workflow.sql').read_text()

def run(sql):
    request = urllib.request.Request(f'https://api.supabase.com/v1/projects/{project}/database/query', data=json.dumps({'query':sql}).encode(), headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        print('Database setup failed:', error.code, error.read().decode()[:1000])
        raise SystemExit(1)

run(query)
result = run("select (select count(*) from public.delivery_admins) as admin_count, (select relrowsecurity from pg_class where oid='public.delivery_requests'::regclass) as private_rows")
print('Delivery migration applied:', json.dumps(result))
if not result or result[0]['admin_count'] == 0:
    raise SystemExit('No studio administrator matched. Add the correct existing auth user before enabling this workflow.')
