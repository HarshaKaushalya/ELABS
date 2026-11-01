import unittest
from src.pipelines.occupancy import analyze_occupancy


class TestOccupancyPipeline(unittest.TestCase):
    def test_occupancy_analysis(self):
        """Test occupancy pipeline returns resolved path and estimated counts."""
        result = analyze_occupancy("demo.mp4")
        self.assertIn("resolved_path", result)
        self.assertIn("estimated_people_count", result)
        self.assertIsInstance(result["estimated_people_count"], (int, float))


if __name__ == "__main__":
    unittest.main()