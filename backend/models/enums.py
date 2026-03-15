import enum

class DepartmentEnum(str, enum.Enum):
    engineering = "Engineering"
    hr = "HR"
    finance = "Finance"
    marketing = "Marketing"
    operations = "Operations"
    sales = "Sales"
    design = "Design"
    legal = "Legal"

class StatusEnum(str, enum.Enum):
    active = "Active"
    inactive = "Inactive"
    on_leave = "On Leave"

class AttendanceStatusEnum(str, enum.Enum):
    present = "Present"
    absent = "Absent"
    late = "Late"
    half_day = "Half Day"
    on_leave = "On Leave"

class AdminRoleEnum(str, enum.Enum):
    super_admin = "super_admin"
    admin = "admin"
    hr_manager = "hr_manager"
    viewer = "viewer"

class AuditActionEnum(str, enum.Enum):
    create = "CREATE"
    update = "UPDATE"
    delete = "DELETE"
    login = "LOGIN"
    export = "EXPORT"
