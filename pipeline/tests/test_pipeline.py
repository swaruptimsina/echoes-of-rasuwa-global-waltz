import json
import math
import struct
import tempfile
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import ingest_nisar as pipe


class TestNisarIngestPipeline(unittest.TestCase):
    def test_parse_single_and_paired_granule_ids(self):
        single = "NISAR_L2_PR_GCOV_033_098_A_016_4005_DHDH_A_20261018T233918_20261018T233952_P05023_N_F_J_001.h5"
        m1 = pipe.parse_granule_id(single)
        self.assertEqual(m1["productType"], "GCOV")
        self.assertEqual(m1["track"], 98)
        self.assertEqual(m1["orbitDirection"], "A")
        self.assertEqual(m1["frame"], 16)
        self.assertEqual(m1["polarization"], "DHDH")
        self.assertEqual(m1["maturity"], "PROVISIONAL")
        self.assertEqual(m1["startUtc"], "2026-10-18T23:39:18Z")

        paired = "NISAR_L2_PR_GUNW_008_131_D_057_010_4000_SH_20251225T065857_20251225T065920_20260118T065858_20260118T065921_X05010_N_P_J_001"
        m2 = pipe.parse_granule_id(paired)
        self.assertEqual(m2["productType"], "GUNW")
        self.assertEqual(m2["track"], 131)
        self.assertEqual(m2["orbitDirection"], "D")
        self.assertEqual(m2["secondaryCycle"], 10)
        self.assertEqual(m2["maturity"], "BETA")
        self.assertEqual(m2["secondaryStartUtc"], "2026-01-18T06:58:58Z")

    def test_synthetic_gcov_and_gunw_manifest_generation(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            gcov_name = "NISAR_L2_PR_GCOV_026_098_A_016_4005_DHDH_A_20260819T233918_20260819T233952_P05023_N_F_J_001.h5"
            gcov_file = tmp_path / gcov_name
            gcov_file.write_text(
                json.dumps(
                    {
                        "centerFrequencyHz": 1_257_500_000.0,
                        "datasets": {
                            "/science/LSAR/GCOV/grids/frequencyA/HHHH": [[0.1, 0.25], [0.01, -9999.0]],
                            "/science/LSAR/GCOV/grids/frequencyA/HVHV": [[0.02, 0.05], [0.005, -9999.0]],
                        },
                    }
                ),
                encoding="utf-8",
            )
            manifest_path = pipe.process_product_to_manifest(
                gcov_file,
                "rasuwa_nepal",
                pipe.AOI_BBOXES["rasuwa_nepal"],
                tmp_path / "out",
                synthetic=True,
            )
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            # Must never classify synthetic fixture as REAL_NISAR_PRODUCT
            self.assertEqual(manifest["classification"], "TEST_FIXTURE")
            self.assertAlmostEqual(manifest["radarWavelengthMeters"], 0.238404, places=5)
            self.assertEqual(len(manifest["inputHdf5Sha256"]), 64)
            self.assertEqual(len(manifest["outputManifestSha256"]), 64)

            # Verify nodata pixel was preserved as 65535 in quantized binary
            hh_bin = (manifest_path.parent / manifest["layers"][0]["quantizedUint16Path"]).read_bytes()
            vals = struct.unpack("<4H", hh_bin)
            self.assertEqual(vals[3], 65535)


if __name__ == "__main__":
    unittest.main()
