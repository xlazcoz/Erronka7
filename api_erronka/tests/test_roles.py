import unittest
from types import SimpleNamespace

from services.auth import can_manage_municipality, is_general_admin, is_municipal_admin


class RolePermissionTests(unittest.TestCase):
    def user(self, rola, udalerria_id=None):
        return SimpleNamespace(rola=rola, udalerria_id=udalerria_id)

    def test_general_admin_can_manage_every_municipality(self):
        admin = self.user("admin")
        self.assertTrue(is_general_admin(admin))
        self.assertTrue(can_manage_municipality(admin, 1))
        self.assertTrue(can_manage_municipality(admin, 2))
        self.assertTrue(can_manage_municipality(admin, None))

    def test_municipal_admin_can_manage_only_own_municipality(self):
        municipal = self.user("udalerri_admin", 1)
        self.assertTrue(is_municipal_admin(municipal))
        self.assertTrue(can_manage_municipality(municipal, 1))
        self.assertFalse(can_manage_municipality(municipal, 2))

    def test_municipal_admin_without_municipality_cannot_manage(self):
        municipal = self.user("udalerri_admin", None)
        self.assertFalse(is_municipal_admin(municipal))
        self.assertFalse(can_manage_municipality(municipal, 1))

    def test_normal_user_cannot_manage(self):
        user = self.user("user", 1)
        self.assertFalse(is_general_admin(user))
        self.assertFalse(is_municipal_admin(user))
        self.assertFalse(can_manage_municipality(user, 1))


if __name__ == "__main__":
    unittest.main()
