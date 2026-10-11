"""Compatibility wrapper for the shared blog sync script. Python standard library only."""
import pathlib, subprocess, sys
root=pathlib.Path(__file__).resolve().parents[1]
subprocess.run(["node",str(root/"scripts/sync-blog.mjs"),*sys.argv[1:]],check=True)
