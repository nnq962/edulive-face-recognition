from config.paths import PathConfig
# from config.database import DatabaseConfig
from config.features import FeatureConfig
from config.network import NetworkConfig
from config.keys import KeysConfig

# Khởi tạo các instance
paths = PathConfig()
# database = DatabaseConfig()
features = FeatureConfig()
network = NetworkConfig()
keys = KeysConfig()

__all__ = ["paths", "features", "network", "keys"]