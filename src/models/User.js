const { Model, DataTypes } = require('sequelize');

const bcrypt = require('bcryptjs')

class User extends Model {
    static init(sequelize) {
        super.init({
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                validate: {
                    isEmail: true,
                }
            },
            verified_email: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            verify_email_token: {
                type: DataTypes.STRING,
            },
            password: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    len: [8,16],
                }
            },
            password_reset_token: {
                type: DataTypes.STRING,
            },
            password_reset_expires: {
                type: DataTypes.DATE,
            }
        }, {
            sequelize,
            indexes: [{
                unique: true,
                fields: ['email'],
            }],
            hooks: {
                beforeSave: async (user, opt) => {
                    if(user.changed('password')){
                        // in this point the password already was verified
                        // it prevent a second verification
                        opt.validate = false;
                        user.password = await bcrypt.hash(user.password, 10);
                    }
                }
            },
        });
    }
}

User.prototype.validPassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = User;